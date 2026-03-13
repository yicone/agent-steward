import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildUrlSearch,
  DEFAULT_FILTERS,
  parseUrlState,
  viewFromUrl,
  viewToUrl,
  type UrlViewerState
} from "../src/lib/urlState";

// ---------------------------------------------------------------------------
// viewToUrl / viewFromUrl
// ---------------------------------------------------------------------------

describe("viewToUrl", () => {
  it("maps antigravity 'markdown' to 'compact'", () => {
    expect(viewToUrl("markdown")).toBe("compact");
  });

  it("maps windsurf 'chat' to 'compact'", () => {
    expect(viewToUrl("chat")).toBe("compact");
  });

  it("keeps transcript as-is", () => {
    expect(viewToUrl("transcript")).toBe("transcript");
  });

  it("keeps trajectory as-is", () => {
    expect(viewToUrl("trajectory")).toBe("trajectory");
  });
});

describe("viewFromUrl", () => {
  it("maps compact back to 'markdown' for antigravity", () => {
    expect(viewFromUrl("compact", "antigravity")).toBe("markdown");
  });

  it("maps compact back to 'chat' for windsurf", () => {
    expect(viewFromUrl("compact", "windsurf")).toBe("chat");
  });

  it("maps null (absent) to default compact per source", () => {
    expect(viewFromUrl(null, "antigravity")).toBe("markdown");
    expect(viewFromUrl(null, "windsurf")).toBe("chat");
  });

  it("passes through transcript and trajectory", () => {
    expect(viewFromUrl("transcript", "antigravity")).toBe("transcript");
    expect(viewFromUrl("trajectory", "windsurf")).toBe("trajectory");
  });
});

// ---------------------------------------------------------------------------
// parseUrlState
// ---------------------------------------------------------------------------

describe("parseUrlState", () => {
  it("returns empty partial for empty search", () => {
    const result = parseUrlState("");
    expect(result).toEqual({});
  });

  it("parses source", () => {
    expect(parseUrlState("?source=antigravity").source).toBe("antigravity");
    expect(parseUrlState("?source=windsurf").source).toBe("windsurf");
  });

  it("ignores invalid source", () => {
    expect(parseUrlState("?source=invalid").source).toBeUndefined();
  });

  it("parses id", () => {
    expect(parseUrlState("?id=abc-123").id).toBe("abc-123");
  });

  it("parses view modes", () => {
    expect(parseUrlState("?view=compact").view).toBe("compact");
    expect(parseUrlState("?view=transcript").view).toBe("transcript");
    expect(parseUrlState("?view=trajectory").view).toBe("trajectory");
  });

  it("ignores invalid view", () => {
    expect(parseUrlState("?view=unknown").view).toBeUndefined();
  });

  it("parses trajectory filter bitfield", () => {
    const result = parseUrlState("?ft=100110");
    expect(result.filters).toEqual({
      thought: true,
      tool: false,
      command: false,
      status: true,
      errorsOnly: true,
      hasOutput: false,
      stepTypeFilter: ""
    });
  });

  it("parses stepType even without ft", () => {
    const result = parseUrlState("?stepType=CORTEX_STEP");
    expect(result.filters?.stepTypeFilter).toBe("CORTEX_STEP");
    // defaults for the boolean flags
    expect(result.filters?.thought).toBe(true);
  });

  it("parses ft and stepType together", () => {
    const result = parseUrlState("?ft=000001&stepType=test");
    expect(result.filters?.hasOutput).toBe(true);
    expect(result.filters?.thought).toBe(false);
    expect(result.filters?.stepTypeFilter).toBe("test");
  });

  it("ignores malformed ft (wrong length)", () => {
    expect(parseUrlState("?ft=111").filters).toBeUndefined();
  });

  it("ignores malformed ft (non-binary)", () => {
    expect(parseUrlState("?ft=abcdef").filters).toBeUndefined();
  });

  it("parses expanded groups", () => {
    const result = parseUrlState("?expanded=g1,g2,g3");
    expect(result.expandedGroups).toEqual(["g1", "g2", "g3"]);
  });

  it("parses selectedRowId", () => {
    expect(parseUrlState("?row=event:42").selectedRowId).toBe("event:42");
  });

  it("parses inspector mode (implies open)", () => {
    const result = parseUrlState("?inspector=errors");
    expect(result.inspectorOpen).toBe(true);
    expect(result.inspectorMode).toBe("errors");
  });

  it("ignores invalid inspector mode", () => {
    const result = parseUrlState("?inspector=invalid");
    expect(result.inspectorOpen).toBeUndefined();
  });

  it("parses includeCleared=1 as true, omits for other values (Partial result)", () => {
    expect(parseUrlState("?includeCleared=1").includeCleared).toBe(true);
    // "0" is not recognised; the property stays absent (undefined) in the Partial result
    expect(parseUrlState("?includeCleared=0").includeCleared).toBeUndefined();
  });

  it("parses a full realistic URL", () => {
    const search =
      "?source=windsurf&id=session-42&view=trajectory&ft=110010&stepType=CMD&expanded=eg-1,eg-3&row=event:99&inspector=event&includeCleared=1";
    const result = parseUrlState(search);
    expect(result).toEqual({
      source: "windsurf",
      id: "session-42",
      view: "trajectory",
      filters: {
        thought: true,
        tool: true,
        command: false,
        status: false,
        errorsOnly: true,
        hasOutput: false,
        stepTypeFilter: "CMD"
      },
      expandedGroups: ["eg-1", "eg-3"],
      selectedRowId: "event:99",
      inspectorOpen: true,
      inspectorMode: "event",
      includeCleared: true
    });
  });
});

// ---------------------------------------------------------------------------
// buildUrlSearch
// ---------------------------------------------------------------------------

function makeDefaultState(overrides?: Partial<UrlViewerState>): UrlViewerState {
  return {
    source: null,
    id: null,
    view: null,
    filters: {
      thought: true,
      tool: true,
      command: true,
      status: false,
      errorsOnly: false,
      hasOutput: false,
      stepTypeFilter: ""
    },
    expandedGroups: [],
    selectedRowId: null,
    inspectorOpen: false,
    inspectorMode: "event",
    includeCleared: false,
    ...overrides
  };
}

describe("buildUrlSearch", () => {
  it("returns empty string for default state", () => {
    expect(buildUrlSearch(makeDefaultState())).toBe("");
  });

  it("includes source and id", () => {
    const search = buildUrlSearch(makeDefaultState({ source: "antigravity", id: "sess-1" }));
    expect(search).toContain("source=antigravity");
    expect(search).toContain("id=sess-1");
  });

  it("omits view when compact (default)", () => {
    const search = buildUrlSearch(makeDefaultState({ view: "compact" }));
    expect(search).not.toContain("view=");
  });

  it("includes view when transcript or trajectory", () => {
    expect(buildUrlSearch(makeDefaultState({ view: "transcript" }))).toContain("view=transcript");
    expect(buildUrlSearch(makeDefaultState({ view: "trajectory" }))).toContain("view=trajectory");
  });

  it("omits ft when filters are at defaults", () => {
    const search = buildUrlSearch(makeDefaultState());
    expect(search).not.toContain("ft=");
  });

  it("includes ft when filters differ from default", () => {
    const search = buildUrlSearch(
      makeDefaultState({
        filters: { thought: false, tool: true, command: true, status: false, errorsOnly: false, hasOutput: false, stepTypeFilter: "" }
      })
    );
    expect(search).toContain("ft=011000");
  });

  it("includes stepType when non-empty", () => {
    const search = buildUrlSearch(
      makeDefaultState({
        filters: { thought: true, tool: true, command: true, status: false, errorsOnly: false, hasOutput: false, stepTypeFilter: "RUN" }
      })
    );
    expect(search).toContain("stepType=RUN");
  });

  it("includes expanded groups when a conversation is selected", () => {
    const search = buildUrlSearch(makeDefaultState({ id: "sess-1", expandedGroups: ["a", "b"] }));
    expect(search).toContain("expanded=a%2Cb"); // comma is encoded
  });

  it("includes empty expanded= when selected but all groups collapsed", () => {
    const search = buildUrlSearch(makeDefaultState({ id: "sess-1", expandedGroups: [] }));
    expect(search).toContain("expanded=");
  });

  it("omits expanded when no conversation is selected", () => {
    const search = buildUrlSearch(makeDefaultState({ id: null, expandedGroups: [] }));
    expect(search).not.toContain("expanded");
  });

  it("includes selectedRowId", () => {
    const search = buildUrlSearch(makeDefaultState({ selectedRowId: "event:42" }));
    expect(search).toContain("row=event%3A42"); // colon encoded
  });

  it("includes inspector mode when open", () => {
    const search = buildUrlSearch(makeDefaultState({ inspectorOpen: true, inspectorMode: "errors" }));
    expect(search).toContain("inspector=errors");
  });

  it("omits inspector when closed", () => {
    const search = buildUrlSearch(makeDefaultState({ inspectorOpen: false, inspectorMode: "errors" }));
    expect(search).not.toContain("inspector");
  });

  it("includes includeCleared only when true", () => {
    expect(buildUrlSearch(makeDefaultState({ includeCleared: true }))).toContain("includeCleared=1");
    expect(buildUrlSearch(makeDefaultState({ includeCleared: false }))).not.toContain("includeCleared");
  });
});

// ---------------------------------------------------------------------------
// Round-trip: buildUrlSearch → parseUrlState
// ---------------------------------------------------------------------------

describe("round-trip", () => {
  it("round-trips a full state", () => {
    const original = makeDefaultState({
      source: "windsurf",
      id: "my-session",
      view: "trajectory",
      filters: { thought: true, tool: false, command: true, status: true, errorsOnly: false, hasOutput: true, stepTypeFilter: "FOO" },
      expandedGroups: ["g1", "g2"],
      selectedRowId: "event:7",
      inspectorOpen: true,
      inspectorMode: "message",
      includeCleared: true
    });

    const search = buildUrlSearch(original);
    const parsed = parseUrlState(search);

    expect(parsed.source).toBe(original.source);
    expect(parsed.id).toBe(original.id);
    expect(parsed.view).toBe(original.view);
    expect(parsed.filters).toEqual(original.filters);
    expect(parsed.expandedGroups).toEqual(original.expandedGroups);
    expect(parsed.selectedRowId).toBe(original.selectedRowId);
    expect(parsed.inspectorOpen).toBe(original.inspectorOpen);
    expect(parsed.inspectorMode).toBe(original.inspectorMode);
    expect(parsed.includeCleared).toBe(original.includeCleared);
  });

  it("round-trips compact view (omitted in URL, parsed as undefined)", () => {
    const original = makeDefaultState({ source: "antigravity", id: "s1", view: "compact" });
    const search = buildUrlSearch(original);
    const parsed = parseUrlState(search);
    // "compact" is the default and omitted from URL; parse returns undefined
    expect(parsed.view).toBeUndefined();
  });

  it("round-trips empty expanded groups (all collapsed)", () => {
    // An empty expandedGroups should encode as 'expanded=' so parse can restore it
    // as an explicit empty array (distinguished from "param absent = no constraint").
    const original = makeDefaultState({ id: "sess-1", expandedGroups: [] });
    const search = buildUrlSearch(original);
    const parsed = parseUrlState(search);
    expect(parsed.expandedGroups).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pushUrlState / cancelPendingUrlPush — debounce + href-guard
// ---------------------------------------------------------------------------

/**
 * Helper: creates a minimal window stub that records replaceState calls and
 * popstate listeners. The timer and listener registration are stored on the stub
 * via Symbol.for keys (window-level state), so deleting the window stub in
 * afterEach resets timer state. `vi.resetModules()` is still called to clear
 * the import cache so each test's dynamic `import(...)` gets a fresh module
 * execution and a clean closure over the window Symbol keys.
 */
function makeWindowStub(initialHref = "http://localhost:3000/") {
  const location = { href: initialHref };
  const replaceStateMock = vi.fn();
  const popstateHandlers: Array<() => void> = [];
  const stub = {
    location,
    history: { state: {} as unknown, replaceState: replaceStateMock },
    addEventListener: (event: string, handler: () => void) => {
      if (event === "popstate") popstateHandlers.push(handler);
    },
  };
  return { stub, location, replaceStateMock, popstateHandlers };
}

function makeUrlViewerState(overrides?: Partial<UrlViewerState>): UrlViewerState {
  return {
    source: "antigravity",
    id: "sess-1",
    view: null,
    filters: { ...DEFAULT_FILTERS, stepTypeFilter: "" },
    expandedGroups: [],
    selectedRowId: null,
    inspectorOpen: false,
    inspectorMode: "event",
    includeCleared: false,
    ...overrides
  };
}

describe("pushUrlState", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;
  });

  it("calls replaceState after the debounce delay", async () => {
    vi.useFakeTimers();
    const { stub, replaceStateMock } = makeWindowStub();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = stub;
    const { pushUrlState } = await import("../src/lib/urlState");

    pushUrlState(makeUrlViewerState(), 300);

    expect(replaceStateMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(replaceStateMock).toHaveBeenCalledOnce();
  });

  it("does not call replaceState if href changed before the timer fires", async () => {
    vi.useFakeTimers();
    const { stub, location, replaceStateMock } = makeWindowStub();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = stub;
    const { pushUrlState } = await import("../src/lib/urlState");

    pushUrlState(makeUrlViewerState(), 300);
    location.href = "http://localhost:3000/?source=windsurf"; // simulate navigation
    vi.advanceTimersByTime(300);

    expect(replaceStateMock).not.toHaveBeenCalled();
  });

  it("cancelPendingUrlPush prevents replaceState from being called", async () => {
    vi.useFakeTimers();
    const { stub, replaceStateMock } = makeWindowStub();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = stub;
    const { pushUrlState, cancelPendingUrlPush: cancelPending } = await import("../src/lib/urlState");

    pushUrlState(makeUrlViewerState(), 300);
    cancelPending();
    vi.advanceTimersByTime(300);

    expect(replaceStateMock).not.toHaveBeenCalled();
  });

  it("re-scheduling resets the debounce timer (only one replaceState call)", async () => {
    vi.useFakeTimers();
    const { stub, replaceStateMock } = makeWindowStub();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = stub;
    const { pushUrlState } = await import("../src/lib/urlState");

    pushUrlState(makeUrlViewerState(), 300);
    vi.advanceTimersByTime(150); // not yet fired
    pushUrlState(makeUrlViewerState(), 300); // reset timer
    vi.advanceTimersByTime(150); // 300 ms from first call, but timer was reset
    expect(replaceStateMock).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150); // now 300 ms from second call
    expect(replaceStateMock).toHaveBeenCalledOnce();
  });

  it("popstate event cancels the pending timer", async () => {
    vi.useFakeTimers();
    const { stub, replaceStateMock, popstateHandlers } = makeWindowStub();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = stub;
    const { pushUrlState } = await import("../src/lib/urlState");

    pushUrlState(makeUrlViewerState(), 300);
    expect(popstateHandlers).toHaveLength(1); // listener was registered
    popstateHandlers[0](); // simulate browser back/forward
    vi.advanceTimersByTime(300);

    expect(replaceStateMock).not.toHaveBeenCalled();
  });

  it("preserves hash and pathname from scheduled URL in replaceState call", async () => {
    vi.useFakeTimers();
    const { stub, replaceStateMock } = makeWindowStub("http://localhost:3000/app?old=1#section");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = stub;
    const { pushUrlState } = await import("../src/lib/urlState");

    pushUrlState(makeUrlViewerState({ source: "antigravity", id: "s1" }), 300);
    vi.advanceTimersByTime(300);

    expect(replaceStateMock).toHaveBeenCalledOnce();
    const [, , url] = replaceStateMock.mock.calls[0] as [unknown, unknown, string];
    expect(url).toContain("/app");
    expect(url).toContain("#section");
    expect(url).toContain("source=antigravity");
  });
});
