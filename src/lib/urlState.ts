import type { Source } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Trajectory filter flags, ordered for compact bitfield encoding. */
export interface TrajectoryFilterFlags {
  thought: boolean;
  tool: boolean;
  command: boolean;
  status: boolean;
  errorsOnly: boolean;
  hasOutput: boolean;
}

/** Full set of viewer state that we persist in the URL query string. */
export interface UrlViewerState {
  source: Source | null;
  id: string | null;
  /** Unified view mode across both sources (compact = markdown/chat). */
  view: "compact" | "transcript" | "trajectory" | null;
  filters: TrajectoryFilterFlags & { stepTypeFilter: string };
  /** Expanded execution-group IDs (complement of collapsed). */
  expandedGroups: string[];
  selectedRowId: string | null;
  inspectorOpen: boolean;
  inspectorMode: "event" | "message" | "errors";
  includeCleared: boolean;
}

// ---------------------------------------------------------------------------
// Defaults & constants
// ---------------------------------------------------------------------------

const FILTER_KEYS: readonly (keyof TrajectoryFilterFlags)[] = [
  "thought",
  "tool",
  "command",
  "status",
  "errorsOnly",
  "hasOutput"
];

/** Default trajectory filter flag values (shared by parse and serialize). */
export const DEFAULT_FILTERS: Readonly<TrajectoryFilterFlags> = {
  thought: true,
  tool: true,
  command: true,
  status: false,
  errorsOnly: false,
  hasOutput: false
};

const DEFAULT_FILTER_BITS = FILTER_KEYS.map((k) => (DEFAULT_FILTERS[k] ? "1" : "0")).join("");

// ---------------------------------------------------------------------------
// Helpers – map between internal view values and URL "compact"
// ---------------------------------------------------------------------------

/**
 * Convert the source-specific internal view value to the unified URL value.
 * Antigravity "markdown" and Windsurf "chat" both map to "compact".
 */
export function viewToUrl(
  view: "markdown" | "chat" | "transcript" | "trajectory",
): "compact" | "transcript" | "trajectory" {
  if (view === "markdown" || view === "chat") return "compact";
  if (view === "transcript") return "transcript";
  return "trajectory";
}

/**
 * Convert the unified URL view value back to the source-specific internal
 * value used by the component state.
 */
export function viewFromUrl(
  urlView: "compact" | "transcript" | "trajectory" | null,
  source: "antigravity",
): "markdown" | "transcript" | "trajectory";
export function viewFromUrl(
  urlView: "compact" | "transcript" | "trajectory" | null,
  source: "windsurf",
): "chat" | "transcript" | "trajectory";
export function viewFromUrl(
  urlView: "compact" | "transcript" | "trajectory" | null,
  source: Source,
): "markdown" | "chat" | "transcript" | "trajectory" {
  if (!urlView || urlView === "compact") {
    return source === "antigravity" ? "markdown" : "chat";
  }
  return urlView; // "transcript" | "trajectory" are the same internally
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

/** Parse the browser search string (including leading "?") into state. */
export function parseUrlState(search: string): Partial<UrlViewerState> {
  const p = new URLSearchParams(search);
  const state: Partial<UrlViewerState> = {};

  // source
  const src = p.get("source");
  if (src === "antigravity" || src === "windsurf") state.source = src;

  // id
  const id = p.get("id");
  if (id) state.id = id;

  // view
  const view = p.get("view");
  if (view === "compact" || view === "transcript" || view === "trajectory") {
    state.view = view;
  }

  // trajectory filters (bitfield)
  const ft = p.get("ft");
  if (ft && /^[01]{6}$/.test(ft)) {
    state.filters = {
      thought: ft[0] === "1",
      tool: ft[1] === "1",
      command: ft[2] === "1",
      status: ft[3] === "1",
      errorsOnly: ft[4] === "1",
      hasOutput: ft[5] === "1",
      stepTypeFilter: p.get("stepType") ?? ""
    };
  } else if (p.has("stepType")) {
    state.filters = {
      ...DEFAULT_FILTERS,
      stepTypeFilter: p.get("stepType") ?? ""
    };
  }

  // expanded groups
  const expanded = p.get("expanded");
  if (expanded !== null) {
    state.expandedGroups = expanded.split(",").filter(Boolean);
  }

  // selected row
  const row = p.get("row");
  if (row) state.selectedRowId = row;

  // inspector
  const inspector = p.get("inspector");
  if (inspector === "event" || inspector === "message" || inspector === "errors") {
    state.inspectorOpen = true;
    state.inspectorMode = inspector;
  }

  // includeCleared
  if (p.get("includeCleared") === "1") state.includeCleared = true;

  return state;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

/** Build a URL search string (with leading "?", or empty) from state. */
export function buildUrlSearch(state: UrlViewerState): string {
  const p = new URLSearchParams();

  if (state.source) p.set("source", state.source);
  if (state.id) p.set("id", state.id);

  // Only include view when it is NOT the default "compact"
  if (state.view && state.view !== "compact") p.set("view", state.view);

  // Trajectory filter bitfield – only include when non-default
  const bits = FILTER_KEYS.map((k) => (state.filters[k] ? "1" : "0")).join("");
  if (bits !== DEFAULT_FILTER_BITS) p.set("ft", bits);
  if (state.filters.stepTypeFilter) p.set("stepType", state.filters.stepTypeFilter);

  // Always include 'expanded' when a conversation is selected, so that an
  // empty list (all groups collapsed) round-trips faithfully and is
  // distinguishable from "no URL constraint on groups" (param absent).
  if (state.id) {
    p.set("expanded", state.expandedGroups.join(","));
  }

  if (state.selectedRowId) p.set("row", state.selectedRowId);

  if (state.inspectorOpen) {
    p.set("inspector", state.inspectorMode);
  }

  if (state.includeCleared) p.set("includeCleared", "1");

  const s = p.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// Debounced URL push
// ---------------------------------------------------------------------------

// Use window-level storage via Symbol.for keys so state survives Next.js HMR
// module re-execution without accumulating duplicate popstate listeners.
const _WIN_TIMER = Symbol.for("__asm_urlstate_timer__");
const _WIN_LISTENER = Symbol.for("__asm_urlstate_listener__");

type AnyWindow = typeof window & Record<symbol, unknown>;

function winTimer(): ReturnType<typeof setTimeout> | null {
  if (typeof window === "undefined") return null;
  return ((window as AnyWindow)[_WIN_TIMER] as ReturnType<typeof setTimeout> | null) ?? null;
}

function setWinTimer(t: ReturnType<typeof setTimeout> | null): void {
  if (typeof window !== "undefined") {
    (window as AnyWindow)[_WIN_TIMER] = t;
  }
}

/**
 * Lazily register the popstate listener.
 * Safe to call multiple times — the registration flag is stored on `window`
 * via a `Symbol.for` key so it persists across Next.js HMR module re-execution
 * and never accumulates duplicate listeners.
 */
function ensurePopstateListener(): void {
  if (typeof window === "undefined") return;
  const w = window as AnyWindow;
  if (w[_WIN_LISTENER]) return;
  w[_WIN_LISTENER] = true;
  // Cancel any pending URL push when the user navigates back/forward so the
  // debounced replaceState never fights browser navigation.
  window.addEventListener("popstate", () => {
    const t = winTimer();
    if (t !== null) {
      clearTimeout(t);
      setWinTimer(null);
    }
  });
}

/** Replace the current URL search with the serialised viewer state (debounced). */
export function syncUrlState(state: UrlViewerState, debounceMs = 300): void {
  if (typeof window === "undefined") return;
  ensurePopstateListener();
  const existing = winTimer();
  if (existing !== null) clearTimeout(existing);
  // Capture the full href at schedule time so a late callback cannot overwrite
  // a different URL (route change or back/forward navigation within the debounce window).
  const scheduledHref = window.location.href;
  setWinTimer(
    setTimeout(() => {
      // If the URL has changed since we scheduled (any navigation, including
      // back/forward that only changed the query string), bail out.
      if (window.location.href !== scheduledHref) {
        setWinTimer(null);
        return;
      }
      const search = buildUrlSearch(state);
      const urlObj = new URL(scheduledHref);
      urlObj.search = search;
      const url = `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
      // Preserve existing history.state so Next.js App Router metadata is not lost.
      window.history.replaceState(window.history.state, "", url);
      setWinTimer(null);
    }, debounceMs),
  );
}

/** Cancel any pending debounced URL sync without performing it. */
export function cancelPendingUrlSync(): void {
  const t = winTimer();
  if (t !== null) {
    clearTimeout(t);
    setWinTimer(null);
  }
}
