"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { JsonViewer } from "@/components/JsonViewer";
import { GlobalSearch } from "@/components/GlobalSearch";
import type { ContextAssetSubtype } from "@/lib/contextAssets";
import { isErrorLikeTrajectoryEvent, matchesConversationSearch, matchesEventSearch, summarizeTrajectoryEvents } from "@/lib/parse/trajectory";
import { formatSourceDiagnostics } from "@/lib/parse/sourceDiagnostics";
import { cn } from "@/lib/utils";
import { parseUrlState, viewToUrl, viewFromUrl, syncUrlState } from "@/lib/urlState";
import type { UrlViewerState, TrajectoryFilterFlags } from "@/lib/urlState";
import type {
  AppConfig,
  ChatMessage,
  ConversationContent,
  ConversationListItem,
  Source,
  SourcesStatus,
  TrajectoryContent,
  TrajectoryEvent
} from "@/lib/types";

type ApiConfigResponse = { path: string; config: AppConfig };
type ApiConversationListResponse = { items: ConversationListItem[]; limit: number; offset: number };

type TrajectoryFilters = TrajectoryFilterFlags & Pick<UrlViewerState["filters"], "stepTypeFilter">;

type RestoredSelection = {
  match?: ConversationListItem;
  effectiveRootId?: string;
  selectedKey: string;
};

type SessionBackupFeedback =
  | {
      kind: "success";
      message: string;
      backupId: string;
    }
  | {
      kind: "error";
      title: string;
      message: string;
      hint?: string;
    };

export type HomeClientExternalSelection = {
  requestId: number;
  sessionId: string;
  source: Source;
  rootId?: string;
};

export type HomeClientAssetHandoff = {
  sessionId: string;
  source: Source;
  rootId?: string;
  subtype: ContextAssetSubtype;
};

export type HomeClientAnalysisHandoff = {
  sessionId: string;
  source: Source;
  rootId?: string;
};

export type HomeClientProps = {
  chrome?: "full" | "embedded";
  externalSelection?: HomeClientExternalSelection | null;
  onOpenAssetsForSession?(handoff: HomeClientAssetHandoff): void;
  onOpenAnalysisForSession?(handoff: HomeClientAnalysisHandoff): void;
  onOpenBackupForSession?(handoff: HomeClientAnalysisHandoff): void;
};

export function resolveInitialSource(input: {
  urlSource?: Source;
  externalSelectionSource?: Source;
  defaultSource: Source;
}): Source {
  return input.externalSelectionSource ?? input.urlSource ?? input.defaultSource;
}

export function shouldResetViewerSelectionOnSourceChange(input: {
  source: Source;
  crossSourceSelection?: Source | null;
  urlId?: string;
  urlSource?: Source;
  externalSelectionRequestId?: number | null;
  pendingExternalSelectionRequestId?: number | null;
}): boolean {
  if (
    input.externalSelectionRequestId != null
    && input.pendingExternalSelectionRequestId === input.externalSelectionRequestId
  ) {
    return false;
  }

  if (input.crossSourceSelection === input.source) {
    return false;
  }

  if (input.urlId && input.urlSource === input.source) {
    return false;
  }

  return true;
}

export function shouldDeferSearchSelectionLoad(input: {
  currentSource: Source;
  nextSource: Source;
  itemCount: number;
}): boolean {
  return input.nextSource !== input.currentSource || input.itemCount === 0;
}

export function shouldBlockUrlSync(input: {
  pendingUrlRestoreId?: string | null;
  isUrlRestoring: boolean;
  isRestorationInitiated: boolean;
}): boolean {
  return Boolean(input.pendingUrlRestoreId) || input.isUrlRestoring || input.isRestorationInitiated;
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatTime(ms: number) {
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

function formatIsoTime(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function resolveRestoredSelection(
  items: ConversationListItem[],
  id: string,
  rootId?: string | null,
): RestoredSelection {
  const exactMatch = rootId
    ? items.find((it) => it.id === id && it.rootId === rootId)
    : undefined;
  const match = exactMatch ?? items.find((it) => it.id === id);
  const effectiveRootId = match?.rootId ?? rootId ?? undefined;

  return {
    match,
    effectiveRootId,
    selectedKey: toSelectionKey(effectiveRootId, id),
  };
}

export function supportsSessionSourceCopy(source: Source): boolean {
  return source === "codex";
}

export function buildSessionBackupRequest(input: {
  source: Source;
  sessionId: string;
  selectedItem: ConversationListItem | null;
  includeSourceCopy: boolean;
}) {
  const includeSourceCopy = input.includeSourceCopy && supportsSessionSourceCopy(input.source);

  return {
    source: input.source,
    sessionId: input.sessionId,
    ...(input.source === "codex" && input.selectedItem?.rootId
      ? { rootId: input.selectedItem.rootId }
      : {}),
    ...(includeSourceCopy ? { includeSourceCopy: true } : {})
  };
}

type ExecutionGroup = {
  id: string;
  label: string;
  events: TrajectoryEvent[];
};

type ErrorGroup = {
  id: string;
  label: string;
  errors: TrajectoryEvent[];
};

type TranscriptHiddenCounts = {
  thoughts: number;
  tools: number;
  commandsHidden: number;
  statusesHidden: number;
  other: number;
};

type TrajectoryRow =
  | {
      id: string;
      type: "group";
      group: ExecutionGroup;
      collapsed: boolean;
    }
  | {
      id: string;
      type: "event";
      groupId: string;
      event: TrajectoryEvent;
    }
  | {
      id: string;
      type: "message";
      groupId: string;
      message: ChatMessage;
      sourceEventIds: string[];
    }
  | {
      id: string;
      type: "actions";
      groupId: string;
      counts: TranscriptHiddenCounts;
      actionEvents: TrajectoryEvent[];
    };

function buildExecutionGroups(events: TrajectoryEvent[]): ExecutionGroup[] {
  const groups: ExecutionGroup[] = [];
  const byId = new Map<string, ExecutionGroup>();
  for (const event of events) {
    const id = event.executionId ?? "ungrouped";
    let group = byId.get(id);
    if (!group) {
      const label = id === "ungrouped" ? "Ungrouped" : `Execution ${id.slice(0, 8)}`;
      group = { id, label, events: [] };
      byId.set(id, group);
      groups.push(group);
    }
    group.events.push(event);
  }
  return groups;
}

function clamp(num: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, num));
}

function computeRowOffsets(rows: TrajectoryRow[], rowHeights: Record<string, number>, estimateHeight: number): number[] {
  const offsets: number[] = new Array(rows.length);
  let running = 0;
  for (let i = 0; i < rows.length; i += 1) {
    offsets[i] = running;
    const row = rows[i]!;
    running += rowHeights[row.id] ?? estimateHeight;
  }
  return offsets;
}

function isKeyStatusLikeEvent(event: TrajectoryEvent): boolean {
  if (event.kind !== "status") return false;
  if (isErrorLikeTrajectoryEvent(event)) return false;
  const haystack = `${event.status ?? ""} ${event.text ?? ""}`.toUpperCase();
  if (haystack.includes("RUNNING")) return true;
  if (haystack.includes("CANCEL")) return true;
  if (haystack.includes("ABORT")) return true;
  if (haystack.includes("TIMEOUT")) return true;
  return false;
}

function buildEmptyTranscriptHiddenCounts(): TranscriptHiddenCounts {
  return {
    thoughts: 0,
    tools: 0,
    commandsHidden: 0,
    statusesHidden: 0,
    other: 0
  };
}

function hasAnyHiddenTranscriptCounts(counts: TranscriptHiddenCounts): boolean {
  return (
    counts.thoughts > 0 ||
    counts.tools > 0 ||
    counts.commandsHidden > 0 ||
    counts.statusesHidden > 0 ||
    counts.other > 0
  );
}

function StatusPill(props: { label: string; tone: "ok" | "warn" | "bad"; title?: string }) {
  return (
    <Badge
      variant={props.tone === "ok" ? "ok" : props.tone === "warn" ? "warn" : "bad"}
      title={props.title}
    >
      {props.label}
    </Badge>
  );
}

function SourceDiagnosticsPanel({ status }: { status: SourcesStatus | null }) {
  const [copied, setCopied] = useState(false);
  if (!status) return null;
  const text = formatSourceDiagnostics(status);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <details className="mb-3 rounded-xl border border-border/70 p-3 text-xs">
      <summary className="cursor-pointer text-sm font-medium">Connection diagnostics details</summary>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="text-muted">Copyable evidence chain for attach diagnostics</div>
        <Button type="button" variant="outline" size="sm" onClick={copy}>{copied ? "Copied" : "Copy diagnostics"}</Button>
      </div>
      <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-background/10 p-2">{text}</pre>
    </details>
  );
}

const bubbleBase =
  "group relative rounded-2xl border px-3 py-2 text-sm leading-relaxed backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_12px_36px_rgba(0,0,0,0.28)]";

function bubbleTone(kind: string) {
  switch (kind) {
    case "user":
      return "bg-accent/10 border-accent/35";
    case "assistant":
      return "bg-background/8 border-border/80";
    case "thought":
      return "bg-cyan-400/10 border-cyan-200/25";
    case "command":
      return "bg-accent/10 border-accent/35";
    case "status":
      return "bg-amber-400/10 border-amber-300/25";
    case "other":
      return "bg-indigo-400/10 border-indigo-300/25";
    case "system":
      return "bg-amber-400/10 border-amber-300/25 text-amber-200";
    case "tool":
      return "bg-panel/35 border-border/70";
    case "subagent":
      return "bg-amber-400/10 border-amber-400/30";
    default:
      return "bg-background/8 border-border/80";
  }
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="min-w-0 text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: (props) => <h1 className="mt-2 text-lg font-semibold first:mt-0" {...props} />,
          h2: (props) => <h2 className="mt-3 text-base font-semibold first:mt-0" {...props} />,
          h3: (props) => <h3 className="mt-3 text-sm font-semibold first:mt-0" {...props} />,
          p: (props) => <p className="mt-2 whitespace-pre-wrap first:mt-0" {...props} />,
          a: (props) => (
            <a className="text-accent underline underline-offset-4 hover:opacity-90" {...props} />
          ),
          ul: (props) => <ul className="mt-2 list-disc space-y-1 pl-5 first:mt-0" {...props} />,
          ol: (props) => <ol className="mt-2 list-decimal space-y-1 pl-5 first:mt-0" {...props} />,
          li: (props) => <li className="min-w-0" {...props} />,
          blockquote: (props) => (
            <blockquote className="mt-2 border-l-2 border-border/70 pl-3 text-muted first:mt-0" {...props} />
          ),
          hr: (props) => <hr className="my-3 border-border/70" {...props} />,
          code: ({ className, children, ...props }) => {
            const isBlock = typeof className === "string" && className.includes("language-");
            if (isBlock) return <code className={className} {...props}>{children}</code>;
            return (
              <code
                className={cn(
                  "rounded-md border border-border/60 bg-background/10 px-1 py-0.5 font-mono text-[0.85em]",
                  className
                )}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: (props) => (
            <pre
              className="mt-2 max-w-full overflow-x-auto rounded-xl border border-border/70 bg-background/12 p-2 text-xs first:mt-0"
              {...props}
            />
          ),
          table: (props) => (
            <div className="mt-2 max-w-full overflow-x-auto first:mt-0">
              <table className="w-full border-separate border-spacing-0 text-xs" {...props} />
            </div>
          ),
          thead: (props) => <thead className="text-muted" {...props} />,
          th: (props) => (
            <th className="whitespace-nowrap border-b border-border/70 px-2 py-1 text-left font-medium" {...props} />
          ),
          td: (props) => <td className="whitespace-nowrap border-b border-border/40 px-2 py-1 align-top" {...props} />
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Splits `text` around case-insensitive occurrences of `query` and returns a
 * React fragment with matching substrings wrapped in a highlighted <mark>.
 * Returns plain text when query is empty or has no match.
 */
function HighlightedText({ text, query }: { text: string; query: string }): React.ReactElement {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let idx = lowerText.indexOf(lowerQ, last);
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <mark key={idx} className="rounded-sm bg-yellow-300/60 px-0 text-inherit dark:bg-yellow-500/40">
        {text.slice(idx, idx + q.length)}
      </mark>
    );
    last = idx + q.length;
    idx = lowerText.indexOf(lowerQ, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function ChatMessageView({
  message,
  selected,
  highlighted,
  onSelect,
  onJumpToTrajectory
}: {
  message: ChatMessage;
  selected?: boolean;
  highlighted?: boolean;
  onSelect?(): void;
  onJumpToTrajectory?(): void;
}) {
  const clickable = typeof onSelect === "function";
  const bubbleClass = cn(
    "transition-shadow",
    clickable && "cursor-pointer",
    selected && "ring-2 ring-accent/40 ring-offset-0",
    highlighted && "ring-2 ring-yellow-400/70 ring-offset-0"
  );

  if (message.role === "tool") {
    return (
      <div className={cn(bubbleBase, bubbleTone("tool"), "break-words", bubbleClass)} onClick={onSelect}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 truncate font-mono text-xs text-muted">{message.title}</div>
          <div className="shrink-0 text-xs text-muted">tool step</div>
        </div>
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted">payload</summary>
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre text-xs">
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  const shouldRenderMarkdown = message.role === "assistant";
  return (
    <div
      className={cn(
        bubbleBase,
        bubbleTone(message.role),
        shouldRenderMarkdown ? "break-words" : "whitespace-pre-wrap break-words",
        onJumpToTrajectory && "pr-12",
        bubbleClass
      )}
      onClick={onSelect}
    >
      {onJumpToTrajectory ? (
        <button
          type="button"
          className="absolute right-2 top-2 rounded-md border border-border/60 bg-background/8 px-2 py-1 text-[10px] text-muted opacity-0 transition-opacity hover:border-accent/35 hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onJumpToTrajectory();
          }}
          title="Jump to Trajectory"
        >
          Trajectory
        </button>
      ) : null}
      {shouldRenderMarkdown ? <MarkdownContent text={message.text} /> : message.text}
    </div>
  );
}

function TranscriptActionsRow(props: {
  counts: TranscriptHiddenCounts;
  actionEvents: TrajectoryEvent[];
  onJumpToTrajectoryEventId?(eventId: string): void;
}) {
  const totalHidden =
    props.counts.thoughts +
    props.counts.tools +
    props.counts.commandsHidden +
    props.counts.statusesHidden +
    props.counts.other;

  if (totalHidden <= 0) return null;

  const parts: string[] = [];
  if (props.counts.tools) parts.push(`tools ${props.counts.tools}`);
  if (props.counts.commandsHidden) parts.push(`commands ${props.counts.commandsHidden}`);
  if (props.counts.statusesHidden) parts.push(`status ${props.counts.statusesHidden}`);
  if (props.counts.thoughts) parts.push(`thoughts ${props.counts.thoughts}`);
  if (props.counts.other) parts.push(`other ${props.counts.other}`);

  return (
    <div className={cn(bubbleBase, bubbleTone("system"))}>
      <details>
        <summary className="cursor-pointer text-xs text-muted">
          <span className="flex items-center gap-2">
            <span>Actions ({parts.join(" • ")})</span>
            {props.onJumpToTrajectoryEventId && props.actionEvents.length ? (
              <button
                type="button"
                className="rounded-md border border-border/60 bg-background/8 px-2 py-1 text-[10px] text-muted hover:border-accent/35 hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onJumpToTrajectoryEventId?.(props.actionEvents[0]!.id);
                }}
                title="Jump to Trajectory"
              >
                Trajectory
              </button>
            ) : null}
          </span>
        </summary>
        {props.actionEvents.length ? (
          <div className="mt-2 flex flex-col gap-2">
            {props.actionEvents.map((event) => (
              <div key={event.id} className="text-xs text-muted">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{event.kind}</Badge>
                  <span className="font-mono">{event.title}</span>
                  <span className="font-mono opacity-80">{event.stepType}</span>
                  {props.onJumpToTrajectoryEventId ? (
                    <button
                      type="button"
                      className="ml-auto rounded-md border border-border/60 bg-background/8 px-2 py-1 text-[10px] text-muted hover:border-accent/35 hover:text-foreground"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        props.onJumpToTrajectoryEventId?.(event.id);
                      }}
                      title="Jump to Trajectory"
                    >
                      Trajectory
                    </button>
                  ) : null}
                </div>

                {event.kind === "thought" && event.text ? (
                  <div className="mt-2 pl-7">
                    <div className="rounded-2xl border border-border/70 bg-background/8 px-3 py-2 text-foreground/90 shadow-sm">
                      <MarkdownContent text={event.text} />
                    </div>
                  </div>
                ) : event.text ? (
                  <div className="mt-1 whitespace-pre-wrap break-words opacity-90">{event.text}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted">Switch to Trajectory for tool/command details.</div>
        )}
      </details>
    </div>
  );
}

function TrajectoryEventView({
  event,
  selected,
  highlighted,
  highlightQuery,
  onSelect,
  onJumpToTrajectory
}: {
  event: TrajectoryEvent;
  selected?: boolean;
  highlighted?: boolean;
  highlightQuery?: string;
  onSelect?(): void;
  onJumpToTrajectory?(): void;
}) {
  const timeLabel = formatIsoTime(event.completedAt ?? event.createdAt);
  const hasDetails = Boolean(event.output || event.toolCalls?.length);
  const clickable = typeof onSelect === "function";
  const shouldRenderMarkdown = event.kind === "thought";
  const isSubagent = event.kind === "subagent";
  const hl = highlightQuery ?? "";

  return (
    <div
      className={cn(
        bubbleBase,
        bubbleTone(event.kind),
        shouldRenderMarkdown ? "break-words" : "whitespace-pre-wrap break-words",
        onJumpToTrajectory && "pr-12",
        "transition-shadow",
        clickable && "cursor-pointer",
        selected && "ring-2 ring-accent/40 ring-offset-0",
        highlighted && "ring-2 ring-yellow-400/70 ring-offset-0",
        isSubagent && "border-l-2 border-l-amber-400/60"
      )}
      onClick={onSelect}
    >
      {onJumpToTrajectory ? (
        <button
          type="button"
          className="absolute right-2 top-2 rounded-md border border-border/60 bg-background/8 px-2 py-1 text-[10px] text-muted opacity-0 transition-opacity hover:border-accent/35 hover:text-foreground group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onJumpToTrajectory();
          }}
          title="Jump to Trajectory"
        >
          Trajectory
        </button>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {isSubagent && event.subagent ? (
            <>
              <Badge className="bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                {event.subagent.type}
              </Badge>
              <Badge title={event.title} className="border border-border/60">
                <HighlightedText text={event.title} query={hl} />
              </Badge>
            </>
          ) : (
            <Badge title={event.title}><HighlightedText text={event.title} query={hl} /></Badge>
          )}
          <span className="truncate font-mono text-xs text-muted">{event.stepType}</span>
        </div>
        <div className="shrink-0 text-xs text-muted">{timeLabel}</div>
      </div>

      {isSubagent && event.subagent?.taskDescription ? (
        <div className="mt-2 text-sm text-muted">
          <HighlightedText text={event.subagent.taskDescription} query={hl} />
        </div>
      ) : null}

      {event.commandLine ? (
        <div className="mt-2 font-mono text-xs">
          $ <HighlightedText text={event.commandLine} query={hl} />
        </div>
      ) : null}

      {event.cwd ? (
        <div className="mt-1 font-mono text-xs text-muted">
          cwd: {event.cwd}
          {typeof event.exitCode === "number" ? ` • exit=${event.exitCode}` : ""}
        </div>
      ) : null}

      {event.text ? (
        <div className="mt-2">
          {shouldRenderMarkdown ? <MarkdownContent text={event.text} /> : <div><HighlightedText text={event.text} query={hl} /></div>}
        </div>
      ) : null}

      {hasDetails ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-muted">details</summary>
          {event.toolCalls?.length ? (
            <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre text-xs">
              {JSON.stringify(event.toolCalls, null, 2)}
            </pre>
          ) : null}
          {event.output ? (
            <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre text-xs">
              {hl ? <HighlightedText text={event.output} query={hl} /> : event.output}
            </pre>
          ) : null}
        </details>
      ) : null}
    </div>
  );
}

function TrajectoryGroupRow(props: {
  row: Extract<TrajectoryRow, { type: "group" }>;
  onToggle(groupId: string): void;
}) {
  return (
    <div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-between"
        onClick={() => props.onToggle(props.row.group.id)}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="font-mono text-xs">{props.row.collapsed ? "▸" : "▾"}</span>
          <span className="truncate">{props.row.group.label}</span>
        </span>
        <Badge className="shrink-0">{props.row.group.events.length}</Badge>
      </Button>
    </div>
  );
}

function VirtualMeasuredRow(props: {
  rowId: string;
  top: number;
  onHeight(rowId: string, height: number): void;
  children: React.ReactNode;
}) {
  const { rowId, top, onHeight, children } = props;
  const ref = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => onHeight(rowId, node.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [rowId, onHeight]);

  return (
    <div
      ref={ref}
      data-row-id={rowId}
      className="absolute inset-x-0 top-0 will-change-transform"
      style={{ transform: `translateY(${top}px)` }}
    >
      <div className="pb-3">{children}</div>
    </div>
  );
}

function VirtualizedTrajectoryRows(props: {
  rows: TrajectoryRow[];
  onToggleGroup(groupId: string): void;
  onSelectRow?(row: TrajectoryRow): void;
  selectedRowId?: string | null;
  highlightedRowId?: string | null;
  scrollToRowId?: string | null;
  onScrolledToRowId?(rowId: string): void;
  onJumpToTrajectoryEventId?(eventId: string): void;
  autoOpenDetailsRowId?: string | null;
  autoOpenDetailsToken?: number;
  onAutoOpenedDetails?(rowId: string, token: number): void;
  searchQuery?: string;
}) {
  const {
    rows,
    onToggleGroup,
    onSelectRow,
    selectedRowId,
    highlightedRowId,
    scrollToRowId,
    onScrolledToRowId,
    onJumpToTrajectoryEventId,
    autoOpenDetailsRowId,
    autoOpenDetailsToken,
    onAutoOpenedDetails,
    searchQuery
  } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});
  const pendingScrollRef = useRef<{ rowId: string; attempts: number } | null>(null);
  const lastAutoOpenTokenRef = useRef<number | null>(null);

  const estimateHeight = 148;
  const overscanPx = 700;

  const offsets = useMemo(() => computeRowOffsets(rows, rowHeights, estimateHeight), [rows, rowHeights]);
  const totalHeight = useMemo(() => {
    if (rows.length === 0) return 0;
    const last = rows[rows.length - 1]!;
    return offsets[rows.length - 1]! + (rowHeights[last.id] ?? estimateHeight);
  }, [rows, offsets, rowHeights]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setViewportHeight(el.clientHeight);
      setScrollTop(el.scrollTop);
    };
    update();

    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!scrollToRowId) {
      pendingScrollRef.current = null;
      return;
    }
    pendingScrollRef.current = { rowId: scrollToRowId, attempts: 0 };
  }, [scrollToRowId]);

  useEffect(() => {
    const pending = pendingScrollRef.current;
    const targetId = scrollToRowId;
    if (!pending || !targetId || pending.rowId !== targetId) return;
    const el = containerRef.current;
    if (!el) return;

    const index = rows.findIndex((r) => r.id === targetId);
    if (index < 0) return;

    const estimateTop = offsets[index] ?? 0;
    if (Math.abs(el.scrollTop - estimateTop) > 2) {
      el.scrollTo({ top: estimateTop, behavior: "auto" });
    }

    const escapeSelector = (value: string) => {
      const css = (globalThis as any).CSS;
      if (css && typeof css.escape === "function") return css.escape(value);
      return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    };

    const align = () => {
      const current = pendingScrollRef.current;
      if (!current || !scrollToRowId || current.rowId !== scrollToRowId) return;
      const container = containerRef.current;
      if (!container) return;

      const selector = `[data-row-id="${escapeSelector(scrollToRowId)}"]`;
      const node = container.querySelector(selector) as HTMLElement | null;
      current.attempts += 1;

      if (node) {
        if (
          autoOpenDetailsRowId &&
          autoOpenDetailsToken &&
          autoOpenDetailsRowId === scrollToRowId &&
          lastAutoOpenTokenRef.current !== autoOpenDetailsToken
        ) {
          lastAutoOpenTokenRef.current = autoOpenDetailsToken;
          const details = node.querySelector("details") as HTMLDetailsElement | null;
          if (details) details.open = true;
          onAutoOpenedDetails?.(autoOpenDetailsRowId, autoOpenDetailsToken);
        }

        const nodeRect = node.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const delta = nodeRect.top - containerRect.top;
        const paddingTop = 10;
        if (Math.abs(delta - paddingTop) > 6) {
          container.scrollTop = container.scrollTop + (delta - paddingTop);
        } else {
          pendingScrollRef.current = null;
          onScrolledToRowId?.(scrollToRowId);
          return;
        }
      }

      if (current.attempts >= 10) {
        pendingScrollRef.current = null;
        onScrolledToRowId?.(scrollToRowId);
        return;
      }

      requestAnimationFrame(align);
    };

    requestAnimationFrame(align);
  }, [
    scrollToRowId,
    rows,
    offsets,
    rowHeights,
    onScrolledToRowId,
    autoOpenDetailsRowId,
    autoOpenDetailsToken,
    onAutoOpenedDetails
  ]);

  const updateHeight = useCallback((rowId: string, height: number) => {
    setRowHeights((prev) => {
      const current = prev[rowId];
      if (typeof current === "number" && Math.abs(current - height) < 1) return prev;
      return { ...prev, [rowId]: height };
    });
  }, []);

  const start = useMemo(() => {
    const target = Math.max(scrollTop - overscanPx, 0);
    let low = 0;
    let high = rows.length - 1;
    let best = 0;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const value = offsets[mid] ?? 0;
      if (value <= target) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return best;
  }, [scrollTop, overscanPx, rows.length, offsets]);

  const end = useMemo(() => {
    const limit = scrollTop + viewportHeight + overscanPx;
    let idx = start;
    while (idx < rows.length) {
      const row = rows[idx]!;
      const top = offsets[idx] ?? 0;
      const height = rowHeights[row.id] ?? estimateHeight;
      if (top > limit) break;
      idx += 1;
      if (top + height > limit) break;
    }
    return clamp(idx + 1, 0, rows.length);
  }, [start, scrollTop, viewportHeight, overscanPx, rows, offsets, rowHeights]);

  const visible = useMemo(
    () =>
      rows.slice(start, end).map((row, localIndex) => {
        const index = start + localIndex;
        return {
          row,
          top: offsets[index] ?? 0
        };
      }),
    [rows, start, end, offsets]
  );

  return (
    <div ref={containerRef} className="relative max-h-[calc(100vh-330px)] overflow-auto pr-1">
      <div className="relative w-full" style={{ height: totalHeight }}>
        {visible.map(({ row, top }) => (
          <VirtualMeasuredRow key={row.id} rowId={row.id} top={top} onHeight={updateHeight}>
            {row.type === "group" ? (
              <TrajectoryGroupRow row={row} onToggle={onToggleGroup} />
            ) : row.type === "event" ? (
              <TrajectoryEventView
                event={row.event}
                selected={selectedRowId === row.id}
                highlighted={highlightedRowId === row.id}
                highlightQuery={searchQuery}
                onSelect={onSelectRow ? () => onSelectRow?.(row) : undefined}
                onJumpToTrajectory={onJumpToTrajectoryEventId ? () => onJumpToTrajectoryEventId(row.event.id) : undefined}
              />
            ) : row.type === "message" ? (
              <ChatMessageView
                message={row.message}
                selected={selectedRowId === row.id}
                highlighted={highlightedRowId === row.id}
                onSelect={onSelectRow ? () => onSelectRow?.(row) : undefined}
                onJumpToTrajectory={
                  onJumpToTrajectoryEventId
                    ? () => {
                        const eventId = row.sourceEventIds[row.sourceEventIds.length - 1];
                        if (eventId) onJumpToTrajectoryEventId(eventId);
                      }
                    : undefined
                }
              />
            ) : row.type === "actions" ? (
              <TranscriptActionsRow
                counts={row.counts}
                actionEvents={row.actionEvents}
                onJumpToTrajectoryEventId={onJumpToTrajectoryEventId}
              />
            ) : null}
          </VirtualMeasuredRow>
        ))}
      </div>
    </div>
  );
}

function InspectorPanel(props: {
  mode: "event" | "message" | "errors";
  event: TrajectoryEvent | null;
  message: ChatMessage | null;
  errorEvents: TrajectoryEvent[];
  groupedErrorEvents: ErrorGroup[];
  activeErrorIndex: number;
  wrapText: boolean;
  onToggleWrapText(): void;
  onSelectError(event: TrajectoryEvent): void;
  onPrevError(): void;
  onNextError(): void;
  onClose(): void;
}) {
  const {
    mode,
    event,
    message,
    errorEvents,
    groupedErrorEvents,
    activeErrorIndex,
    wrapText,
    onToggleWrapText,
    onSelectError,
    onPrevError,
    onNextError,
    onClose
  } = props;
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200);
    } catch {
      // ignore
    }
  }, []);

  const downloadJson = useCallback(
    (filename: string, data: unknown) => {
      try {
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch {
        // ignore
      }
    },
    []
  );

  const Field = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex gap-2">
      <div className="w-28 shrink-0 text-xs text-muted">{label}</div>
      <div className={cn("min-w-0 text-xs text-foreground", mono && "font-mono break-words")}>{value}</div>
    </div>
  );

  const Pre = ({ text }: { text: string }) => (
    <pre className={cn("mt-2 rounded-lg border border-border bg-background/20 p-2 text-xs", wrapText ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto")}>
      {text}
    </pre>
  );

  const canDownload = mode === "event" && event != null;

  return (
    <Card className="min-w-0 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">Inspector</div>
        <div className="flex items-center gap-2">
          {canDownload && (
            <Button variant="ghost" size="sm" onClick={() => downloadJson(`event-${event.id}.json`, event)} title="Download event as JSON">
              Download JSON
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onToggleWrapText}>
            {wrapText ? "No wrap" : "Wrap"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {mode === "errors" ? (
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span>Errors: {errorEvents.length}</span>
            {errorEvents.length ? (
              <span>
                {Math.max(activeErrorIndex, 0) + 1} / {errorEvents.length}
              </span>
            ) : null}
          </div>
          {errorEvents.length ? (
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onPrevError}>Prev error</Button>
              <Button variant="outline" size="sm" onClick={onNextError}>Next error</Button>
            </div>
          ) : null}
          <div className="mt-2 flex flex-col gap-2">
            {errorEvents.length ? (
              groupedErrorEvents.map((group) => (
                <div key={group.id} className="rounded-lg border border-border/70 p-2">
                  <div className="mb-2 text-xs font-medium text-muted">{group.label} • {group.errors.length}</div>
                  <div className="flex flex-col gap-2">
                    {group.errors.map((e) => {
                      const time = formatIsoTime(e.completedAt ?? e.createdAt);
                      const isActive = activeErrorIndex >= 0 && errorEvents[activeErrorIndex]?.id === e.id;
                      return (
                        <button
                          key={e.id}
                          className={cn(
                            "rounded-lg border border-border bg-background/10 p-2 text-left text-xs hover:border-accent/40",
                            isActive && "ring-2 ring-accent/40"
                          )}
                          onClick={() => onSelectError(e)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 font-medium">
                              <span className="font-mono">{e.kind}</span> • {e.title}
                            </div>
                            <div className="shrink-0 text-muted">{time}</div>
                          </div>
                          <div className="mt-1 font-mono text-muted">
                            {e.stepType}
                            {typeof e.exitCode === "number" ? ` • exit=${e.exitCode}` : ""}
                            {e.status ? ` • ${e.status}` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted">No errors detected in this session.</div>
            )}
          </div>
        </div>
      ) : mode === "message" ? (
        message ? (
          <div className="space-y-2">
            <Field label="role" value={message.role} mono />
            {"title" in message && message.title ? <Field label="title" value={message.title} mono /> : null}
            {"payload" in message && message.payload ? (
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-muted">payload</div>
                  <Button variant="ghost" size="sm" onClick={() => copy("message-payload", JSON.stringify(message.payload, null, 2))}>
                    {copiedKey === "message-payload" ? "Copied" : "Copy"}
                  </Button>
                </div>
                <JsonViewer data={message.payload} />
              </div>
            ) : null}
            {"text" in message && message.text ? (
              <div>
                {(() => {
                  const text = message.text;
                  return (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted">text</div>
                        <Button variant="ghost" size="sm" onClick={() => copy("message-text", text)}>
                          {copiedKey === "message-text" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <Pre text={text} />
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-xs text-muted">Select a message to inspect.</div>
        )
      ) : event ? (
        <div className="space-y-2">
          <Field label="id" value={event.id} mono />
          <Field label="kind" value={event.kind} mono />
          <Field label="title" value={event.title} />
          <Field label="stepType" value={event.stepType} mono />
          {event.executionId ? <Field label="executionId" value={event.executionId} mono /> : null}
          {event.status ? <Field label="status" value={event.status} mono /> : null}
          {typeof event.exitCode === "number" ? <Field label="exitCode" value={String(event.exitCode)} mono /> : null}
          {event.cwd ? <Field label="cwd" value={event.cwd} mono /> : null}
          {event.commandLine ? (
            <div>
              {(() => {
                const commandLine = event.commandLine;
                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted">commandLine</div>
                      <Button variant="ghost" size="sm" onClick={() => copy("event-command", commandLine)}>
                        {copiedKey === "event-command" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Pre text={commandLine} />
                  </>
                );
              })()}
            </div>
          ) : null}
          {event.text ? (
            <div>
              {(() => {
                const text = event.text;
                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted">text</div>
                      <Button variant="ghost" size="sm" onClick={() => copy("event-text", text)}>
                        {copiedKey === "event-text" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Pre text={text} />
                  </>
                );
              })()}
            </div>
          ) : null}
          {event.toolCalls?.length ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted">toolCalls</div>
                <Button variant="ghost" size="sm" onClick={() => copy("event-toolCalls", JSON.stringify(event.toolCalls, null, 2))}>
                  {copiedKey === "event-toolCalls" ? "Copied" : "Copy"}
                </Button>
              </div>
              <JsonViewer data={event.toolCalls} />
            </div>
          ) : null}
          {event.output ? (
            <div>
              {(() => {
                const output = event.output;
                return (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-muted">output</div>
                      <Button variant="ghost" size="sm" onClick={() => copy("event-output", output)}>
                        {copiedKey === "event-output" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Pre text={output} />
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-xs text-muted">Select an event to inspect.</div>
      )}
    </Card>
  );
}

function TrajectoryFilterControls({
  filters,
  onFiltersChange,
  groupCount,
  eventSearch,
  onEventSearchChange,
  searchMatchCount,
  activeMatchIndex,
  onNavigateMatch,
}: {
  filters: TrajectoryFilters;
  onFiltersChange: (updater: (prev: TrajectoryFilters) => TrajectoryFilters) => void;
  groupCount: number;
  eventSearch: string;
  onEventSearchChange: (value: string) => void;
  searchMatchCount: number;
  activeMatchIndex: number;
  onNavigateMatch: (offset: number) => void;
}) {
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Button
          variant={filters.thought ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, thought: !prev.thought, errorsOnly: false }))}
        >
          Thoughts
        </Button>
        <Button
          variant={filters.tool ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, tool: !prev.tool, errorsOnly: false }))}
        >
          Tools
        </Button>
        <Button
          variant={filters.command ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, command: !prev.command, errorsOnly: false }))}
        >
          Commands
        </Button>
        <Button
          variant={filters.status ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, status: !prev.status, errorsOnly: false }))}
        >
          Status
        </Button>
        <Button
          variant={filters.subagent ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, subagent: !prev.subagent, errorsOnly: false }))}
        >
          Subagents
        </Button>
        <Button
          variant={filters.errorsOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, errorsOnly: !prev.errorsOnly }))}
        >
          Only errors
        </Button>
        <Button
          variant={filters.hasOutput ? "default" : "outline"}
          size="sm"
          onClick={() => onFiltersChange((prev) => ({ ...prev, hasOutput: !prev.hasOutput }))}
        >
          Has output
        </Button>
        <span className="text-xs text-muted">Groups: {groupCount}</span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Input
          placeholder="Search events…"
          value={eventSearch}
          onChange={(e) => onEventSearchChange(e.target.value)}
          className="h-7 text-xs"
        />
        {searchMatchCount > 0 ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateMatch(-1)}
              title="Previous match"
              aria-label="Previous match"
            >
              ←
            </Button>
            <span className="shrink-0 whitespace-nowrap text-xs text-muted">{Math.max(activeMatchIndex, 0) + 1} / {searchMatchCount}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateMatch(1)}
              title="Next match"
              aria-label="Next match"
            >
              →
            </Button>
          </>
        ) : eventSearch.trim() ? (
          <span className="shrink-0 text-xs text-muted">0 matches</span>
        ) : null}
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Input
          placeholder="Filter stepType…"
          value={filters.stepTypeFilter}
          onChange={(e) => onFiltersChange((prev) => ({ ...prev, stepTypeFilter: e.target.value }))}
          className="h-7 text-xs"
        />
      </div>
    </>
  );
}

function toSelectionKey(rootId: string | undefined, id: string): string {
  return JSON.stringify({ rootId: rootId ?? null, id });
}

function fromSelectionKey(key: string | null): { rootId?: string; id: string } | null {
  if (!key) return null;
  try {
    const parsed = JSON.parse(key) as { rootId?: unknown; id?: unknown };
    if (typeof parsed?.id !== "string") return null;
    return {
      id: parsed.id,
      ...(typeof parsed.rootId === "string" && parsed.rootId.length > 0 ? { rootId: parsed.rootId } : {})
    };
  } catch {
    return null;
  }
}

export default function HomeClient({
  chrome = "full",
  externalSelection = null,
  onOpenAssetsForSession,
  onOpenAnalysisForSession,
  onOpenBackupForSession,
}: HomeClientProps = {}) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<SourcesStatus | null>(null);
  const [source, setSource] = useState<Source>("antigravity");
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [filter, setFilter] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [content, setContent] = useState<ConversationContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupIncludeSourceCopy, setBackupIncludeSourceCopy] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<SessionBackupFeedback | null>(null);
  const [antigravityView, setAntigravityView] = useState<"transcript" | "trajectory" | "markdown">("markdown");
  const [windsurfView, setWindsurfView] = useState<"chat" | "transcript" | "trajectory">("chat");
  const [windsurfIncludeCleared, setWindsurfIncludeCleared] = useState(false);
  const [trajectoryFilters, setTrajectoryFilters] = useState<TrajectoryFilters>({
    thought: true,
    tool: true,
    command: true,
    status: false,
    subagent: true,
    errorsOnly: false,
    hasOutput: false,
    stepTypeFilter: ""
  });
  const [collapsedExecutionGroups, setCollapsedExecutionGroups] = useState<Record<string, boolean>>({});

  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorMode, setInspectorMode] = useState<"event" | "message" | "errors">("event");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [scrollToRowId, setScrollToRowId] = useState<string | null>(null);
  const [inspectorWrapText, setInspectorWrapText] = useState(true);
  const [pendingTrajectoryJumpEventId, setPendingTrajectoryJumpEventId] = useState<string | null>(null);
  const [autoOpenDetailsRowId, setAutoOpenDetailsRowId] = useState<string | null>(null);
  const [autoOpenDetailsToken, setAutoOpenDetailsToken] = useState(0);
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null);

  // Set by handleGlobalSearchSelect when it triggers a cross-source switch.
  // The useEffect([source]) reset checks this ref so it doesn't wipe the pending
  // session selection that the callback already queued.
  const crossSourceSelectionRef = useRef<Source | null>(null);
  const externalSelectionRequestRef = useRef<number | null>(null);
  const externalSelectionSourceRef = useRef<Source | undefined>(externalSelection?.source);
  const pendingExternalSelectionRequestRef = useRef<number | null>(null);
  const pendingSearchSelectionRef = useRef<Pick<HomeClientExternalSelection, "sessionId" | "source" | "rootId"> | null>(null);

  // URL deep-link: parsed once on mount. The useState lazy initializer guarantees
  // parseUrlState only runs on the first render; the ref gives mutable access
  // to the same object so effects can clear it after consumption.
  const [_urlInitOnce] = useState<Partial<UrlViewerState>>(
    () => (typeof window !== "undefined" ? parseUrlState(window.location.search) : {})
  );
  const urlInitRef = useRef<Partial<UrlViewerState>>(_urlInitOnce);
  // True from when urlInitRef is consumed until the async restore promise
  // settles, so the URL-sync effect stays suppressed for the whole restore.
  const urlRestoringRef = useRef(false);
  // Track if restoration has been initiated (to prevent re-running)
  const restorationInitiatedRef = useRef(false);
  // Track if restoration has completed to prevent re-running after hot reload
  const restorationCompletedRef = useRef(false);

  // Re-parse URL on mount to handle hot reload (Fast Refresh)
  const [mountCount, setMountCount] = useState(0);
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const parsed = parseUrlState(window.location.search);
    // Always update urlInitRef from current URL on mount/hot reload
    // This ensures hot reload doesn't lose the deep-link parameters
    if (parsed.id) {
      urlInitRef.current = parsed;
      // Reset restoration flags so restoration can run again
      restorationInitiatedRef.current = false;
      restorationCompletedRef.current = false;
      // Increment mount count to force restoration effect to re-run
      setMountCount(c => c + 1);
    }
  }, []);

  // Ref to track the selected conversation button for auto-scroll
  const selectedButtonRef = useRef<HTMLButtonElement | null>(null);

  // Scroll selected conversation into view when selectedKey changes
  useEffect(() => {
    if (selectedButtonRef.current) {
      selectedButtonRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedKey]);
  // Tracks whether the first config load has completed, so refreshConfigAndStatus
  // can skip re-setting source on manual refreshes without closing over `config`.
  const configInitializedRef = useRef(false);

  const selectedItem = useMemo(() => {
    if (!selectedKey) return null;
    const parsed = fromSelectionKey(selectedKey);
    if (!parsed) return null;
    return items.find((it) => it.id === parsed.id && it.rootId === parsed.rootId) ?? null;
  }, [items, selectedKey]);

  const sourceCopySupported = useMemo(() => supportsSessionSourceCopy(source), [source]);

  const filteredItems = useMemo(() => {
    if (!filter.trim()) return items;
    return items.filter((it) => matchesConversationSearch(it, filter));
  }, [items, filter]);

  const rawTrajectoryEvents = useMemo(() => {
    if (content?.kind !== "trajectory") return [];
    return content.events;
  }, [content]);

  const executionGroups = useMemo(() => buildExecutionGroups(rawTrajectoryEvents), [rawTrajectoryEvents]);

  const trajectoryRows = useMemo(() => {
    if (content?.kind !== "trajectory") return [];
    const rows: TrajectoryRow[] = [];
    for (const group of executionGroups) {
      const collapsed = collapsedExecutionGroups[group.id] ?? false;
      rows.push({
        id: `group:${group.id}`,
        type: "group",
        group,
        collapsed
      });
      if (!collapsed) {
        for (const event of group.events) {
          if (trajectoryFilters.errorsOnly) {
            if (!isErrorLikeTrajectoryEvent(event)) continue;
          } else {
            if (event.kind === "thought" && !trajectoryFilters.thought) continue;
            if (event.kind === "tool" && !trajectoryFilters.tool) continue;
            if (event.kind === "command" && !trajectoryFilters.command) continue;
            if (event.kind === "status" && !trajectoryFilters.status) continue;
            if (event.kind === "subagent" && !trajectoryFilters.subagent) continue;
          }
          if (trajectoryFilters.hasOutput && !event.output) continue;
          if (trajectoryFilters.stepTypeFilter && !event.stepType.toLowerCase().includes(trajectoryFilters.stepTypeFilter.toLowerCase())) continue;
          if (!matchesEventSearch(event, eventSearch)) continue;
          rows.push({
            id: `event:${event.id}`,
            type: "event",
            groupId: group.id,
            event
          });
        }
      }
    }
    return rows;
  }, [content, executionGroups, collapsedExecutionGroups, trajectoryFilters, eventSearch]);

  const transcriptRows = useMemo(() => {
    if (content?.kind !== "trajectory") return [];
    const rows: TrajectoryRow[] = [];

      for (const group of executionGroups) {
        const collapsed = collapsedExecutionGroups[group.id] ?? false;
        rows.push({
          id: `group:${group.id}`,
          type: "group",
          group,
          collapsed
        });

        if (collapsed) continue;

        let hidden = buildEmptyTranscriptHiddenCounts();
        let pendingActionEvents: TrajectoryEvent[] = [];

        const pushMessage = (groupId: string, message: ChatMessage, stableKey: string) => {
          const last = rows[rows.length - 1];
          if (last && last.type === "message" && last.groupId === groupId && last.message.role === message.role && last.message.role !== "tool") {
            if ("text" in last.message && "text" in message) {
              last.message = { ...last.message, text: `${last.message.text}\n\n${message.text}` };
              if (!last.sourceEventIds.includes(stableKey)) {
                last.sourceEventIds = [...last.sourceEventIds, stableKey];
              }
              return;
            }
          }
          rows.push({
            id: `msg:${groupId}:${stableKey}`,
            type: "message",
            groupId,
            message,
            sourceEventIds: [stableKey]
          });
        };

        const flushActionsUnderAssistant = (groupId: string, stableKey: string) => {
          if (!hasAnyHiddenTranscriptCounts(hidden)) return;
          rows.push({
            id: `actions:${groupId}:${stableKey}`,
            type: "actions",
            groupId,
            counts: hidden,
            actionEvents: pendingActionEvents
          });
          hidden = buildEmptyTranscriptHiddenCounts();
          pendingActionEvents = [];
        };

      for (const event of group.events) {
        if (event.kind === "user" && event.text) {
          pushMessage(group.id, { role: "user", text: event.text }, event.id);
          continue;
        }
        if (event.kind === "assistant" && event.text) {
          pushMessage(group.id, { role: "assistant", text: event.text }, event.id);
          flushActionsUnderAssistant(group.id, event.id);
          continue;
        }

          if (event.kind === "thought") {
            hidden.thoughts += 1;
            pendingActionEvents.push(event);
            continue;
          }

        if (isKeyStatusLikeEvent(event)) {
          const text = event.text ?? event.status ?? event.title;
          pushMessage(group.id, { role: "system", text }, event.id);
          continue;
        }

        // Always surface errors (including tool errors) in Transcript mode.
        if (isErrorLikeTrajectoryEvent(event)) {
          rows.push({
            id: `event:${event.id}`,
            type: "event",
            groupId: group.id,
            event
          });
          continue;
        }

        if (event.kind === "command") {
          hidden.commandsHidden += 1;
          continue;
        }

          if (event.kind === "tool") {
            hidden.tools += 1;
            pendingActionEvents.push(event);
            continue;
          }

        if (event.kind === "status") {
          hidden.statusesHidden += 1;
          continue;
        }

        hidden.other += 1;
      }

        if (hasAnyHiddenTranscriptCounts(hidden)) {
          rows.push({
            id: `actions:${group.id}:tail`,
            type: "actions",
            groupId: group.id,
            counts: hidden,
            actionEvents: pendingActionEvents
          });
        }
      }

      return rows;
  }, [content, executionGroups, collapsedExecutionGroups]);

  const errorEvents = useMemo(() => rawTrajectoryEvents.filter(isErrorLikeTrajectoryEvent), [rawTrajectoryEvents]);

  const eventSearchMatchEvents = useMemo(() => {
    if (!eventSearch.trim()) return [];
    // Derive from trajectoryRows so navigation only considers events that are
    // currently visible (respecting kind/hasOutput/stepTypeFilter/errorsOnly
    // filters). trajectoryRows already applies matchesEventSearch, so all
    // event rows in it are already search matches.
    return trajectoryRows
      .filter((row): row is Extract<TrajectoryRow, { type: "event" }> => row.type === "event")
      .map((row) => row.event);
  }, [trajectoryRows, eventSearch]);

  const activeSearchMatchIndex = useMemo(() => {
    if (!eventSearch.trim() || !selectedRowId?.startsWith("event:")) return -1;
    const eventId = selectedRowId.slice("event:".length);
    return eventSearchMatchEvents.findIndex((e) => e.id === eventId);
  }, [eventSearch, eventSearchMatchEvents, selectedRowId]);

  const groupedErrorEvents = useMemo(() => {
    const groups: ErrorGroup[] = [];
    const byId = new Map<string, ErrorGroup>();
    for (const event of errorEvents) {
      const executionId = event.executionId ?? "ungrouped";
      const kind = event.kind || "unknown";
      const stepType = event.stepType || "unknown";
      const id = `${executionId}:${kind}:${stepType}`;
      let group = byId.get(id);
      if (!group) {
        const executionLabel = executionId === "ungrouped" ? "Ungrouped" : `Execution ${executionId.slice(0, 8)}`;
        group = { id, label: `${executionLabel} • ${kind}/${stepType}`, errors: [] };
        byId.set(id, group);
        groups.push(group);
      }
      group.errors.push(event);
    }
    return groups;
  }, [errorEvents]);

  const activeErrorIndex = useMemo(() => {
    if (!selectedRowId?.startsWith("event:")) return -1;
    const eventId = selectedRowId.slice("event:".length);
    return errorEvents.findIndex((event) => event.id === eventId);
  }, [errorEvents, selectedRowId]);

  const eventsById = useMemo(() => {
    const map = new Map<string, TrajectoryEvent>();
    for (const event of rawTrajectoryEvents) map.set(event.id, event);
    return map;
  }, [rawTrajectoryEvents]);

  const rowsById = useMemo(() => {
    const map = new Map<string, TrajectoryRow>();
    for (const row of trajectoryRows) map.set(row.id, row);
    for (const row of transcriptRows) map.set(row.id, row);
    return map;
  }, [trajectoryRows, transcriptRows]);

  const selectedRow = useMemo(() => (selectedRowId ? rowsById.get(selectedRowId) ?? null : null), [rowsById, selectedRowId]);

  const selectedEvent = useMemo(() => {
    if (selectedRow?.type === "event") return selectedRow.event;
    if (selectedRowId?.startsWith("event:")) {
      const eventId = selectedRowId.slice("event:".length);
      return rawTrajectoryEvents.find((e) => e.id === eventId) ?? null;
    }
    return null;
  }, [selectedRow, selectedRowId, rawTrajectoryEvents]);

  const selectedMessage = useMemo(() => {
    if (selectedRow?.type !== "message") return null;
    return selectedRow.message;
  }, [selectedRow]);

  const onSelectRow = useCallback((row: TrajectoryRow) => {
    if (row.type !== "event" && row.type !== "message") return;
    setSelectedRowId(row.id);
    setInspectorMode(row.type === "event" ? "event" : "message");
    setInspectorOpen(true);
  }, []);

  const openErrorCenter = useCallback(() => {
    setInspectorMode("errors");
    setInspectorOpen(true);
  }, []);

  const jumpToEvent = useCallback(
    (event: TrajectoryEvent) => {
      const groupId = event.executionId ?? "ungrouped";
      setCollapsedExecutionGroups((prev) => ({ ...prev, [groupId]: false }));
      const rowId = `event:${event.id}`;
      setSelectedRowId(rowId);
      setInspectorMode("event");
      setInspectorOpen(true);
      setScrollToRowId(rowId);
      setHighlightedRowId(rowId);
      window.setTimeout(() => {
        setHighlightedRowId((current) => (current === rowId ? null : current));
      }, 1800);

      if (trajectoryFilters.errorsOnly) {
        setTrajectoryFilters((prev) => ({ ...prev, errorsOnly: false }));
      } else {
        if (event.kind === "thought" && !trajectoryFilters.thought) setTrajectoryFilters((prev) => ({ ...prev, thought: true }));
        if (event.kind === "tool" && !trajectoryFilters.tool) setTrajectoryFilters((prev) => ({ ...prev, tool: true }));
        if (event.kind === "command" && !trajectoryFilters.command) setTrajectoryFilters((prev) => ({ ...prev, command: true }));
        if (event.kind === "status" && !trajectoryFilters.status) setTrajectoryFilters((prev) => ({ ...prev, status: true }));
        if (event.kind === "subagent" && !trajectoryFilters.subagent) setTrajectoryFilters((prev) => ({ ...prev, subagent: true }));
      }

      if (content?.kind === "trajectory" && content.source === "antigravity" && antigravityView !== "trajectory") {
        setAntigravityView("trajectory");
      }
      if (source === "windsurf" && windsurfView !== "trajectory") {
        setWindsurfView("trajectory");
      }
    },
    [content, antigravityView, source, windsurfView, trajectoryFilters]
  );

  const navigateErrorByOffset = useCallback((offset: number) => {
    if (!errorEvents.length) return;
    const baseIndex = activeErrorIndex >= 0 ? activeErrorIndex : (offset >= 0 ? -1 : errorEvents.length);
    const nextIndex = (baseIndex + offset + errorEvents.length) % errorEvents.length;
    const next = errorEvents[nextIndex];
    if (next) jumpToEvent(next);
  }, [activeErrorIndex, errorEvents, jumpToEvent]);

  const navigateSearchMatchByOffset = useCallback((offset: number) => {
    if (!eventSearchMatchEvents.length) return;
    const baseIndex = activeSearchMatchIndex >= 0 ? activeSearchMatchIndex : (offset >= 0 ? -1 : eventSearchMatchEvents.length);
    const nextIndex = (baseIndex + offset + eventSearchMatchEvents.length) % eventSearchMatchEvents.length;
    const next = eventSearchMatchEvents[nextIndex];
    if (next) jumpToEvent(next);
  }, [activeSearchMatchIndex, eventSearchMatchEvents, jumpToEvent]);

  const requestJumpToTrajectoryEventId = useCallback((eventId: string) => {
    setPendingTrajectoryJumpEventId(eventId);
    setAutoOpenDetailsRowId(`event:${eventId}`);
    setAutoOpenDetailsToken((prev) => prev + 1);
  }, []);

  const loadConversation = useCallback(async (
    nextSource: Source,
    id: string,
    stepOffset?: number,
    view?: "chat" | "trajectory",
    opts?: { includeCleared?: boolean; rootId?: string }
  ): Promise<ConversationContent | null> => {
    setLoadingContent(true);
    setError(null);
    try {
      let qp = "";
      if (nextSource === "windsurf") {
        const sp = new URLSearchParams();
        sp.set("stepOffset", String(stepOffset ?? 0));
        if (view === "trajectory") sp.set("view", "trajectory");
        const includeCleared = opts?.includeCleared ?? windsurfIncludeCleared;
        if (includeCleared) sp.set("includeCleared", "1");
        qp = `?${sp.toString()}`;
      } else if (nextSource === "codex" && opts?.rootId) {
        const sp = new URLSearchParams();
        sp.set("rootId", opts.rootId);
        qp = `?${sp.toString()}`;
      }
      const res = await fetch(`/api/conversations/${nextSource}/${id}${qp}`);
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error ?? "Failed to load conversation");
      const loaded = json as ConversationContent;
      setContent(loaded);
      return loaded;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setContent(null);
      return null;
    } finally {
      setLoadingContent(false);
    }
  }, [windsurfIncludeCleared]);

  const createSessionBackup = useCallback(async () => {
    if (!selectedId) return;

    setCreatingBackup(true);
    setBackupFeedback(null);

    try {
      const res = await fetch("/api/session-backups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          buildSessionBackupRequest({
            source,
            sessionId: selectedId,
            selectedItem,
            includeSourceCopy: backupIncludeSourceCopy
          })
        )
      });
      const json = (await res.json()) as { backupId?: string; error?: string; title?: string; hint?: string };
      if (!res.ok || typeof json.backupId !== "string") {
        setBackupFeedback({
          kind: "error",
          title: json.title ?? "Backup failed",
          message: json.error ?? "Failed to back up session",
          hint: json.hint
        });
        return;
      }
      setBackupFeedback({
        kind: "success",
        message: "Session backup created.",
        backupId: json.backupId
      });
    } catch (e) {
      setBackupFeedback({
        kind: "error",
        title: "Backup failed",
        message: e instanceof Error ? e.message : String(e)
      });
    } finally {
      setCreatingBackup(false);
    }
  }, [backupIncludeSourceCopy, selectedId, selectedItem, source]);

  const handleGlobalSearchSelect = useCallback(
    (sessionId: string, sessionSource: Source, rootId?: string) => {
      // Switch source tab if needed. Flag the ref so the useEffect([source]) reset
      // below does not wipe the selection state we set here.
      if (sessionSource !== source) {
        crossSourceSelectionRef.current = sessionSource;
        setSource(sessionSource);
      } else {
        crossSourceSelectionRef.current = null;
      }
      // Best-effort: find the matching list item in the current items list.
      // If we're switching source, items still holds the old source's list, so
      // this may fail. A useEffect below corrects selectedKey once items reloads.
      const match = items.find((it) => {
        if (it.id !== sessionId) return false;
        return rootId ? it.rootId === rootId : true;
      });
      const key = toSelectionKey(match?.rootId ?? rootId, sessionId);
      setSelectedKey(key);
      setSelectedId(sessionId);
      setContent(null);
      setInspectorOpen(false);
      setSelectedRowId(null);
      setScrollToRowId(null);
      setEventSearch("");
      setAntigravityView("markdown");
      setWindsurfView("chat");
      setCollapsedExecutionGroups({});
      if (shouldDeferSearchSelectionLoad({ currentSource: source, nextSource: sessionSource, itemCount: items.length })) {
        pendingSearchSelectionRef.current = { sessionId, source: sessionSource, rootId };
        return;
      }
      pendingSearchSelectionRef.current = null;
      loadConversation(sessionSource, sessionId, 0, sessionSource === "windsurf" ? "chat" : undefined, {
        rootId: match?.rootId ?? rootId
      }).catch(
        (e) => setError(e instanceof Error ? e.message : String(e))
      );
    },
    [source, items, loadConversation]
  );

  useEffect(() => {
    externalSelectionSourceRef.current = externalSelection?.source;
    if (!externalSelection) return;
    if (externalSelectionRequestRef.current === externalSelection.requestId) return;
    externalSelectionRequestRef.current = externalSelection.requestId;
    pendingExternalSelectionRequestRef.current = externalSelection.requestId;
    urlInitRef.current = {};
    urlRestoringRef.current = false;
    restorationInitiatedRef.current = false;
    handleGlobalSearchSelect(externalSelection.sessionId, externalSelection.source, externalSelection.rootId);
  }, [externalSelection, handleGlobalSearchSelect]);

  useEffect(() => {
    if (!pendingTrajectoryJumpEventId) return;
    if (content?.kind !== "trajectory") return;

    const event = eventsById.get(pendingTrajectoryJumpEventId);
    if (!event) {
      setPendingTrajectoryJumpEventId(null);
      return;
    }

    if (content.source === "antigravity" && antigravityView !== "trajectory") setAntigravityView("trajectory");
    if (content.source === "windsurf" && windsurfView !== "trajectory") setWindsurfView("trajectory");

    const groupId = event.executionId ?? "ungrouped";
    setCollapsedExecutionGroups((prev) => {
      if (prev[groupId] === false) return prev;
      return { ...prev, [groupId]: false };
    });

    setTrajectoryFilters((prev) => {
      let changed = false;
      const next = { ...prev };
      if (event.kind === "thought" && !prev.thought) {
        next.thought = true;
        changed = true;
      }
      if (event.kind === "tool" && !prev.tool) {
        next.tool = true;
        changed = true;
      }
      if (event.kind === "command" && !prev.command) {
        next.command = true;
        changed = true;
      }
      if (event.kind === "status" && !prev.status) {
        next.status = true;
        changed = true;
      }
      if (event.kind === "subagent" && !prev.subagent) {
        next.subagent = true;
        changed = true;
      }
      return changed ? next : prev;
    });

    const rowId = `event:${event.id}`;
    const hasRow = trajectoryRows.some((row) => row.id === rowId);
    if (!hasRow) return;

    setSelectedRowId(rowId);
    setInspectorMode("event");
    setInspectorOpen(true);
    setScrollToRowId(rowId);
    setPendingTrajectoryJumpEventId(null);
  }, [pendingTrajectoryJumpEventId, content, eventsById, trajectoryRows, antigravityView, windsurfView]);

  useEffect(() => {
    setBackupFeedback(null);
    if (!sourceCopySupported) {
      setBackupIncludeSourceCopy(false);
    }
  }, [selectedId, source, sourceCopySupported]);

  async function refreshConfigAndStatus() {
    const isFirstLoad = !configInitializedRef.current;
    const cfgRes = await fetch("/api/config");
    const cfgJson = (await cfgRes.json()) as ApiConfigResponse;
    setConfig(cfgJson.config);
    configInitializedRef.current = true;

    // URL deep-link: only set source on first load.
    // On manual refresh, preserve the user's current source selection.
    if (isFirstLoad) {
      const urlInit = urlInitRef.current;
      const initSource = resolveInitialSource({
        urlSource: urlInit.source ?? undefined,
        externalSelectionSource: externalSelectionSourceRef.current,
        defaultSource: cfgJson.config.ui.defaultSource,
      });
      setSource(initSource);
    }

    const stRes = await fetch("/api/sources");
    setStatus((await stRes.json()) as SourcesStatus);
  }

  // Ref to track the current loadList operation for cancellation
  const loadListAbortRef = useRef<AbortController | null>(null);

  async function loadList(nextSource: Source) {
    // Cancel any in-flight loadList operation
    if (loadListAbortRef.current) {
      loadListAbortRef.current.abort();
    }
    const abortController = new AbortController();
    loadListAbortRef.current = abortController;

    setLoadingList(true);
    setError(null);
    setItems([]);
    try {
      const res = await fetch(`/api/conversations?source=${nextSource}&limit=200&offset=0`, {
        signal: abortController.signal
      });
      // Check if this operation was cancelled by a newer one
      if (abortController.signal.aborted) return;
      const json = (await res.json()) as ApiConversationListResponse;
      if (!res.ok) throw new Error((json as any)?.error ?? "Failed to load conversations");
      // Check again after await
      if (abortController.signal.aborted) return;
      setItems(json.items);
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // Ignore abort errors
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      // Only clear loading if this is still the current operation
      if (loadListAbortRef.current === abortController) {
        setLoadingList(false);
        loadListAbortRef.current = null;
      }
    }
  }

  async function loadMoreWindsurfChat() {
    if (!selectedId || source !== "windsurf" || content?.kind !== "chat") return;
    const currentOffset = content.stepOffset ?? 0;
    const sp = new URLSearchParams();
    sp.set("stepOffset", String(currentOffset));
    if (windsurfIncludeCleared) sp.set("includeCleared", "1");
    const res = await fetch(`/api/conversations/windsurf/${selectedId}?${sp.toString()}`);
    const json = (await res.json()) as any;
    if (!res.ok) {
      setError(json?.error ?? "Failed to load more");
      return;
    }
    const next = json as ConversationContent;
    if (next.kind !== "chat") return;
    setContent({
      kind: "chat",
      messages: [...content.messages, ...next.messages],
      stepOffset: next.stepOffset,
      numTotalSteps: next.numTotalSteps ?? content.numTotalSteps
    });
  }

  async function loadMoreWindsurfTrajectory() {
    if (!selectedId || source !== "windsurf" || content?.kind !== "trajectory" || content.source !== "windsurf") return;
    const currentOffset = content.stepOffset ?? 0;
    const sp = new URLSearchParams();
    sp.set("stepOffset", String(currentOffset));
    sp.set("view", "trajectory");
    if (windsurfIncludeCleared) sp.set("includeCleared", "1");
    const res = await fetch(`/api/conversations/windsurf/${selectedId}?${sp.toString()}`);
    const json = (await res.json()) as any;
    if (!res.ok) {
      setError(json?.error ?? "Failed to load more");
      return;
    }
    const next = json as ConversationContent;
    if (next.kind !== "trajectory" || next.source !== "windsurf") return;

    const mergedEvents = [...content.events, ...next.events];
    const mergedStepOffset = typeof next.stepOffset === "number" ? next.stepOffset : currentOffset + next.events.length;
    const mergedNumTotalSteps = typeof next.numTotalSteps === "number" ? next.numTotalSteps : content.numTotalSteps;
    const totalSteps = typeof mergedNumTotalSteps === "number" ? mergedNumTotalSteps : mergedStepOffset;

    const merged: TrajectoryContent = {
      ...content,
      events: mergedEvents,
      stepOffset: mergedStepOffset,
      ...(typeof mergedNumTotalSteps === "number" ? { numTotalSteps: mergedNumTotalSteps } : {}),
      summary: summarizeTrajectoryEvents(mergedEvents, totalSteps)
    };
    setContent(merged);
  }

  useEffect(() => {
    refreshConfigAndStatus().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("viewer:windsurf:includeCleared");
      if (stored === "1") setWindsurfIncludeCleared(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("viewer:windsurf:includeCleared", windsurfIncludeCleared ? "1" : "0");
    } catch {
      // ignore
    }
  }, [windsurfIncludeCleared]);

  useEffect(() => {
    loadList(source).catch(() => {});
    const crossSourceSelection = crossSourceSelectionRef.current;
    const urlInit = urlInitRef.current;

    if (!shouldResetViewerSelectionOnSourceChange({
      source,
      crossSourceSelection,
      urlId: urlInit.id ?? undefined,
      urlSource: urlInit.source ?? undefined,
      externalSelectionRequestId: externalSelectionRequestRef.current,
      pendingExternalSelectionRequestId: pendingExternalSelectionRequestRef.current,
    })) {
      if (crossSourceSelection === source) {
        crossSourceSelectionRef.current = null;
      }
      if (pendingExternalSelectionRequestRef.current === externalSelectionRequestRef.current) {
        pendingExternalSelectionRequestRef.current = null;
      }
      return;
    }

    crossSourceSelectionRef.current = null;
    pendingExternalSelectionRequestRef.current = null;

    setSelectedKey(null);
    setSelectedId(null);
    setContent(null);
    setEventSearch("");
    setAntigravityView("markdown");
    setWindsurfView("chat");
    setCollapsedExecutionGroups({});
  }, [source]);

  // When items reloads (e.g. after a source-switch triggered by GlobalSearch),
  // re-derive selectedKey from selectedId so the conversation list highlights
  // the correct item. This corrects the provisional key set in
  // handleGlobalSearchSelect when the target session was in a different source.
  useEffect(() => {
    if (!selectedId) return;
    const selectedRootId = fromSelectionKey(selectedKey)?.rootId;
    const exactMatch = items.find((it) => {
      if (it.id !== selectedId) return false;
      return selectedRootId ? it.rootId === selectedRootId : true;
    });
    const match = exactMatch ?? items.find((it) => it.id === selectedId);
    if (!match) return;
    const expectedKey = toSelectionKey(match.rootId, match.id);
    setSelectedKey((prev) => (prev === expectedKey ? prev : expectedKey));
  }, [items, selectedId, selectedKey]);

  useEffect(() => {
    const pendingSelection = pendingSearchSelectionRef.current;
    if (!pendingSelection) return;
    if (pendingSelection.source !== source) return;
    if (loadingList || items.length === 0) return;

    const match = items.find((it) => {
      if (it.id !== pendingSelection.sessionId) return false;
      return pendingSelection.rootId ? it.rootId === pendingSelection.rootId : true;
    }) ?? items.find((it) => it.id === pendingSelection.sessionId);

    const effectiveRootId = match?.rootId ?? pendingSelection.rootId;
    const key = toSelectionKey(effectiveRootId, pendingSelection.sessionId);
    setSelectedKey(key);
    setSelectedId(pendingSelection.sessionId);
    pendingSearchSelectionRef.current = null;

    loadConversation(
      pendingSelection.source,
      pendingSelection.sessionId,
      0,
      pendingSelection.source === "windsurf" ? "chat" : undefined,
      { rootId: effectiveRootId }
    ).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [items, loadingList, source, loadConversation]);

  useEffect(() => {
    if (content?.kind !== "trajectory") return;
    const groupIds = buildExecutionGroups(content.events).map((group) => group.id);
    if (groupIds.length === 0) {
      setCollapsedExecutionGroups({});
      return;
    }
    setCollapsedExecutionGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (let i = 0; i < groupIds.length; i += 1) {
        const id = groupIds[i]!;
        next[id] = prev[id] ?? i !== groupIds.length - 1;
      }
      return next;
    });
  }, [content]);

  // -----------------------------------------------------------------------
  // URL deep-link: restore conversation + viewer state from URL query on
  // initial page load. Runs once after the conversation list for the URL
  // source has been fetched. All URL-derived values are consumed here and
  // the ref is cleared so subsequent user interactions follow the normal
  // state flow.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const urlInit = urlInitRef.current;
    if (!urlInit.id) return; // nothing to restore
    if (items.length === 0 && loadingList) return; // list not ready yet
    // Guard against the race where refreshConfigAndStatus has not yet called
    // setSource(urlInit.source): if the URL specifies a source that differs
    // from the current source, wait until the source-change effect has run
    // and the list for the correct source is loaded.
    if (urlInit.source && source !== urlInit.source) return;
    // Additional guard: if items is empty but we're not loading, the list
    // might have been reset by a source change. Wait for actual data.
    if (items.length === 0 && !loadingList) return;

    // Consume the init ref so this runs only once.
    const {
      id,
      rootId,
      view,
      filters,
      expandedGroups,
      selectedRowId: urlRow,
      inspectorOpen: urlInspector,
      inspectorMode: urlInspMode,
      includeCleared: urlCleared
    } = urlInit;
    urlRestoringRef.current = true; // block URL sync until the async restore fully settles
    restorationInitiatedRef.current = true; // mark that restoration has started
    // Don't clear urlInitRef.current - keep it so URL sync check continues to block

    let cancelled = false; // guard against stale async callbacks after unmount/re-render

    // Determine the internal view mode from the unified URL value
    const effectiveSource = urlInit.source ?? source;
    let apiView: "chat" | "trajectory" | undefined;
    if (effectiveSource === "antigravity") {
      const restoredView = viewFromUrl(view ?? null, "antigravity");
      setAntigravityView(restoredView);
      apiView = undefined;
    } else if (effectiveSource === "windsurf") {
      const restoredView = viewFromUrl(view ?? null, "windsurf");
      setWindsurfView(restoredView);
      apiView = restoredView !== "chat" ? "trajectory" : "chat";
    } else {
      // Codex only supports trajectory mode regardless of URL `view`.
      apiView = "trajectory";
    }

    if (filters) setTrajectoryFilters(filters);
    // For windsurf: explicitly set includeCleared from URL (treat absent as false)
    if (effectiveSource === "windsurf") {
      setWindsurfIncludeCleared(urlCleared === true);
    }
    if (urlInspector && urlInspMode) {
      setInspectorOpen(true);
      setInspectorMode(urlInspMode);
    }

    // Select the conversation
    const restoredSelection = resolveRestoredSelection(items, id!, rootId);
    const effectiveRootId = restoredSelection.effectiveRootId ?? (rootId ?? undefined);
    const key = restoredSelection.selectedKey;
    setSelectedKey(key);
    setSelectedId(id!);

    loadConversation(effectiveSource, id!, 0, apiView, {
      includeCleared: urlCleared === true,
      rootId: effectiveRootId ?? undefined
    }).then((loaded) => {
      // Gate follow-up state on a successful load (loadConversation returns null on failure).
      if (!loaded) { urlRestoringRef.current = false; return; }
      // Guard against the user navigating away before this async callback fires.
      if (cancelled) { urlRestoringRef.current = false; return; }
      // Apply expanded groups authoritatively from the URL.  When the URL carried
      // an explicit 'expanded' param (even empty), pre-populate collapsedExecutionGroups
      // for ALL groups derived from the loaded content so that the content-change
      // effect (which defaults to expanding the last group) finds prev[id] already
      // set and does not override our intent.
      if (expandedGroups !== undefined) {
        const allGroupIds = loaded.kind === "trajectory"
          ? buildExecutionGroups(loaded.events).map((g) => g.id)
          : [];
        setCollapsedExecutionGroups(() => {
          const next: Record<string, boolean> = {};
          for (const gid of allGroupIds) {
            next[gid] = !expandedGroups.includes(gid); // collapsed unless in expanded list
          }
          return next;
        });
      }
      if (urlRow) {
        setSelectedRowId(urlRow);
        setScrollToRowId(urlRow);
      }
      // Restore complete — allow URL sync to resume.
      urlRestoringRef.current = false;
      restorationInitiatedRef.current = false;
      restorationCompletedRef.current = true;
      urlInitRef.current = {}; // clear after restoration completes
    });
    return () => { cancelled = true; urlRestoringRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, loadingList, source, mountCount]);

  // -----------------------------------------------------------------------
  // URL sync: push current viewer state to URL on every relevant change
  // (debounced to avoid noisy browser history).
  // -----------------------------------------------------------------------
  useEffect(() => {
    // Only sync once config has loaded (avoids writing default-only URLs on SSR hydration)
    if (!config) return;
    // Skip while the deep-link restore effect has not yet consumed the initial URL state,
    // or while the async restore is still in progress, so replaceState never overwrites
    // the URL before restoration (including row/expanded state) is fully applied.
    if (shouldBlockUrlSync({
      pendingUrlRestoreId: urlInitRef.current.id ?? null,
      isUrlRestoring: urlRestoringRef.current,
      isRestorationInitiated: restorationInitiatedRef.current,
    })) return;
    const currentView =
      source === "antigravity"
        ? antigravityView
        : source === "windsurf"
          ? windsurfView
          : "trajectory";

    // Derive expanded groups from collapsedExecutionGroups (inverse mapping)
    const expanded: string[] = [];
    for (const [gid, collapsed] of Object.entries(collapsedExecutionGroups)) {
      if (!collapsed) expanded.push(gid);
    }

    syncUrlState({
      source,
      id: selectedId,
      rootId: selectedItem?.rootId ?? null,
      view: viewToUrl(currentView),
      filters: trajectoryFilters,
      expandedGroups: expanded,
      selectedRowId,
      inspectorOpen,
      inspectorMode,
      // Only encode includeCleared for windsurf; omit for antigravity to keep URLs clean.
      includeCleared: source === "windsurf" ? windsurfIncludeCleared : false,
    });
  }, [
    config, source, selectedId, selectedItem, antigravityView, windsurfView,
    trajectoryFilters, collapsedExecutionGroups, selectedRowId,
    inspectorOpen, inspectorMode, windsurfIncludeCleared, mountCount
  ]);

  const antigravityPill = (() => {
    if (!status) return <StatusPill label="Antigravity: ..." tone="warn" />;
    if (!status.antigravity.discovered) return <StatusPill label="Antigravity: not found" tone="bad" title={status.antigravity.error} />;
    if (status.antigravity.reachable) return <StatusPill label="Antigravity: connected" tone="ok" title={status.antigravity.discoveryPath} />;
    return <StatusPill label="Antigravity: discovered" tone="warn" title={status.antigravity.error ?? status.antigravity.discoveryPath} />;
  })();

  const windsurfPill = (() => {
    if (!status) return <StatusPill label="Windsurf: ..." tone="warn" />;
    if (status.windsurf.attached) return <StatusPill label="Windsurf: attached" tone="ok" title={status.windsurf.logPath} />;
    if (status.windsurf.logPath) return <StatusPill label="Windsurf: not attached" tone="warn" title={status.windsurf.error ?? status.windsurf.logPath} />;
    return <StatusPill label="Windsurf: not found" tone="bad" title={status.windsurf.error} />;
  })();

  const codexPill = (() => {
    if (!status) return <StatusPill label="Codex: ..." tone="warn" />;
    if (status.codex.sessionsFound) return <StatusPill label="Codex: sessions found" tone="ok" title={status.codex.sessionsDir} />;
    return <StatusPill label="Codex: not found" tone="bad" title={status.codex.error} />;
  })();

  const toggleExecutionGroup = useCallback((groupId: string) => {
    setCollapsedExecutionGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const inspectorNode = inspectorOpen ? (
    <InspectorPanel
      mode={inspectorMode}
      event={selectedEvent}
      message={selectedMessage}
      errorEvents={errorEvents}
      groupedErrorEvents={groupedErrorEvents}
      activeErrorIndex={activeErrorIndex}
      wrapText={inspectorWrapText}
      onToggleWrapText={() => setInspectorWrapText((v) => !v)}
      onSelectError={jumpToEvent}
      onPrevError={() => navigateErrorByOffset(-1)}
      onNextError={() => navigateErrorByOffset(1)}
      onClose={() => {
        setInspectorOpen(false);
        setSelectedRowId(null);
      }}
    />
  ) : null;

  const withInspector = (main: React.ReactNode) =>
    inspectorOpen ? (
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">{main}</div>
        {inspectorNode}
      </div>
    ) : (
      main
    );

  return (
    <div className="mx-auto max-w-[1200px] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="text-lg font-semibold">{chrome === "full" ? "Agent Storage Manager" : "Sessions"}</div>
          {antigravityPill}
          {windsurfPill}
          {codexPill}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {chrome === "full" ? <GlobalSearch onSelect={handleGlobalSearchSelect} /> : null}
          <Button variant="outline" size="sm" onClick={() => refreshConfigAndStatus()}>
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Settings</Link>
          </Button>
        </div>
      </div>

      <SourceDiagnosticsPanel status={status} />

      <Card className="mb-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={source === "antigravity" ? "default" : "outline"}
            size="sm"
            onClick={() => setSource("antigravity")}
          >
            Antigravity
          </Button>
          <Button
            variant={source === "windsurf" ? "default" : "outline"}
            size="sm"
            onClick={() => setSource("windsurf")}
          >
            Windsurf
          </Button>
          <Button
            variant={source === "codex" ? "default" : "outline"}
            size="sm"
            onClick={() => setSource("codex")}
          >
            Codex
          </Button>
          <div className="flex-1" />
          <div className="w-full sm:w-[360px] sm:max-w-[360px]">
            <Input placeholder="Search by title or path…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
        </div>
        <div className="mt-2 text-xs text-muted">
          Roots: {config ? config.roots.filter((r) => r.source === source && r.enabled).length : "..."} • Items:{" "}
          {items.length}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <div className="p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Conversations</div>
              <div className="text-xs text-muted">{loadingList ? "Loading…" : ""}</div>
            </div>
          </div>
          <div className="max-h-[calc(100vh-240px)] overflow-auto border-t border-border/80">
            {filteredItems.map((it) => {
              const key = toSelectionKey(it.rootId, it.id);
              const selected = selectedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  ref={selected ? selectedButtonRef : undefined}
                  className={cn(
                    "w-full border-b border-border/40 px-3 py-2 text-left transition-colors hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70",
                    selected && "border-accent/25 bg-accent/10"
                  )}
                  onClick={() => {
                    setSelectedKey(key);
                    setSelectedId(it.id);
                    setContent(null);
                    setInspectorOpen(false);
                    setSelectedRowId(null);
                    setScrollToRowId(null);
                    setEventSearch("");
                    setAntigravityView("markdown");
                    setWindsurfView("chat");
                    setCollapsedExecutionGroups({});
                    loadConversation(source, it.id, 0, source === "windsurf" ? "chat" : undefined, {
                      rootId: it.rootId
                    }).catch(() => {});
                  }}
                  title={it.path}
                >
                  <div className="truncate text-sm font-semibold" title={it.title ?? it.id}>
                    {it.title ?? it.id}
                  </div>
                  <div className="mt-1 truncate text-xs text-muted">
                    {it.cwd ? (
                      `Running in ${it.cwd}`
                    ) : (
                      <span className="font-mono">{it.id}</span>
                    )}
                  </div>
                  {(it.gitBranch || it.model) ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {it.gitBranch ? (
                        <Badge className="text-[10px] px-1 py-0 border border-border/60 bg-background/5">
                          <span className="opacity-60 mr-1">git:</span>{it.gitBranch}
                        </Badge>
                      ) : null}
                      {it.model ? (
                        <Badge className="text-[10px] px-1 py-0 bg-accent/15 text-accent-foreground">
                          {it.model}
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-1 text-xs text-muted">
                    {formatTime(it.mtimeMs)} • {formatBytes(it.sizeBytes)}
                  </div>
                  {it.duplicateRootIds && it.duplicateRootIds.length > 0 ? (
                    <div
                      className="mt-1 truncate text-[10px] text-amber-600 dark:text-amber-400"
                      title={`Also in roots: ${it.duplicateRootIds.join(", ")}`}
                    >
                      ⚠ duplicate in {it.duplicateRootIds.length} other {it.duplicateRootIds.length === 1 ? "root" : "roots"}
                    </div>
                  ) : null}
                </button>
              );
            })}
            {!loadingList && filteredItems.length === 0 ? (
              <div className="p-3 text-sm text-muted">No conversations found for this source. Add roots in Settings.</div>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">Viewer</div>
            <div className="min-w-0 flex-1 text-right text-xs text-muted">
              {loadingContent
                ? "Loading…"
                : selectedId
                  ? (
                      <span className="block truncate" title={selectedItem?.title ?? selectedId}>
                        {selectedItem?.title ? (
                          <>
                            {selectedItem.title}{" "}
                            <span className="font-mono opacity-80">({selectedId})</span>
                          </>
                        ) : (
                          <span className="font-mono">{selectedId}</span>
                        )}
                      </span>
                    )
                  : ""}
            </div>
          </div>

          {error ? (
            <div className="mb-3 rounded-2xl border border-danger/55 bg-danger/10 px-3 py-2 text-sm text-danger">
              <span className="font-medium">Error:</span> {error}
            </div>
          ) : null}

          {selectedId ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3">
                {sourceCopySupported ? (
                  <label
                    className="flex items-center gap-2 text-xs text-muted"
                    title="Advanced option. Copies the original source file into the backup package."
                  >
                    <Switch
                      checked={backupIncludeSourceCopy}
                      onCheckedChange={setBackupIncludeSourceCopy}
                      aria-label="Include source copy"
                      disabled={creatingBackup}
                    />
                    Include source copy
                  </label>
                ) : null}
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {onOpenAssetsForSession ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onOpenAssetsForSession({
                        sessionId: selectedId,
                        source,
                        ...(selectedItem?.rootId ? { rootId: selectedItem.rootId } : {}),
                        subtype: "rule",
                      })
                    }
                    title="Route to Assets with a bounded subtype handoff from the selected session"
                  >
                    Inspect in Assets
                  </Button>
                ) : null}
                {onOpenAnalysisForSession ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onOpenAnalysisForSession({
                        sessionId: selectedId,
                        source,
                        ...(selectedItem?.rootId ? { rootId: selectedItem.rootId } : {}),
                      })
                    }
                    title="Route to Analysis with bounded session evidence context"
                  >
                    Review in Analysis
                  </Button>
                ) : null}
                {onOpenBackupForSession ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onOpenBackupForSession({
                        sessionId: selectedId,
                        source,
                        ...(selectedItem?.rootId ? { rootId: selectedItem.rootId } : {}),
                      })
                    }
                    title="Route to Backup / Migration with bounded session backup context"
                  >
                    Open in Backup / Migration
                  </Button>
                ) : null}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void createSessionBackup()}
                  disabled={creatingBackup}
                  title="Create a managed session backup package"
                >
                  {creatingBackup ? "Backing up…" : "Back Up Session"}
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a
                    href={
                      source === "codex" && selectedItem?.rootId
                        ? `/api/conversations/${source}/${selectedId}/diagnostic?rootId=${encodeURIComponent(selectedItem.rootId)}`
                        : `/api/conversations/${source}/${selectedId}/diagnostic`
                    }
                    title="Download diagnostic export (includes raw LS payloads; may contain sensitive data)"
                  >
                    Diagnostic JSON
                  </a>
                </Button>
              </div>
            </div>
          ) : null}

          {backupFeedback ? (
            <div
              className={cn(
                "mb-3 rounded-2xl border px-3 py-2 text-sm",
                backupFeedback.kind === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-danger/55 bg-danger/10 text-danger"
              )}
            >
              {backupFeedback.kind === "success" ? (
                <>
                  <span className="font-medium">{backupFeedback.message}</span>{" "}
                  <span className="font-mono text-xs opacity-90">{backupFeedback.backupId}</span>
                </>
              ) : (
                <>
                  <span className="font-medium">{backupFeedback.title}:</span> {backupFeedback.message}
                  {backupFeedback.hint ? (
                    <span className="mt-1 block text-xs opacity-90">{backupFeedback.hint}</span>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {!selectedId ? <div className="text-sm text-muted">Select a conversation on the left.</div> : null}

          {selectedId && source === "windsurf" ? (
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={windsurfView === "chat" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setInspectorOpen(false);
                    setSelectedRowId(null);
                    setScrollToRowId(null);
                    setWindsurfView("chat");
                    setContent(null);
                    setCollapsedExecutionGroups({});
                    loadConversation("windsurf", selectedId, 0, "chat").catch(() => {});
                  }}
                >
                  Compact
                </Button>
                <Button
                  variant={windsurfView === "transcript" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setInspectorOpen(false);
                    setSelectedRowId(null);
                    setScrollToRowId(null);
                    setWindsurfView("transcript");
                    if (content?.kind !== "trajectory" || content.source !== "windsurf") {
                      setContent(null);
                      setCollapsedExecutionGroups({});
                      loadConversation("windsurf", selectedId, 0, "trajectory").catch(() => {});
                    }
                  }}
                >
                  Transcript
                </Button>
                <Button
                  variant={windsurfView === "trajectory" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setInspectorOpen(false);
                    setSelectedRowId(null);
                    setScrollToRowId(null);
                    setWindsurfView("trajectory");
                    if (content?.kind !== "trajectory" || content.source !== "windsurf") {
                      setContent(null);
                      setCollapsedExecutionGroups({});
                      loadConversation("windsurf", selectedId, 0, "trajectory").catch(() => {});
                    }
                  }}
                >
                  Trajectory
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <Switch
                    checked={windsurfIncludeCleared}
                    onCheckedChange={(checked) => {
                      setWindsurfIncludeCleared(checked);
                      if (!selectedId || source !== "windsurf") return;
                      setInspectorOpen(false);
                      setSelectedRowId(null);
                      setScrollToRowId(null);
                      setContent(null);
                      setCollapsedExecutionGroups({});
                      const nextView = windsurfView === "chat" ? "chat" : "trajectory";
                      loadConversation("windsurf", selectedId, 0, nextView, { includeCleared: checked }).catch(() => {});
                    }}
                    aria-label="Show cleared steps"
                  />
                  Show cleared
                </label>
                <div className="text-xs text-muted">
                  {windsurfView === "chat"
                    ? "Compact view (backed by legacy chat data)"
                    : windsurfView === "trajectory"
                      ? "Process-first view"
                      : "Transcript view"}
                </div>
              </div>
            </div>
          ) : null}

          {selectedId && content?.kind === "trajectory" && content.source === "antigravity" ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={antigravityView === "markdown" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAntigravityView("markdown")}
                  >
                    Compact
                  </Button>
                  <Button
                    variant={antigravityView === "transcript" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAntigravityView("transcript")}
                  >
                    Transcript
                  </Button>
                  <Button
                    variant={antigravityView === "trajectory" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setAntigravityView("trajectory")}
                  >
                    Trajectory
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>steps {content.summary.totalSteps}</Badge>
                  <Badge>events {content.summary.renderedEvents}</Badge>
                  <Badge>thoughts {content.summary.thoughtCount}</Badge>
                  <Badge>tools {content.summary.toolCount + content.summary.commandCount}</Badge>
                  {content.summary.subagentCount > 0 ? (
                    <Badge className="bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                      subagents {content.summary.subagentCount}
                    </Badge>
                  ) : null}
                  {content.summary.errorCount > 0 ? (
                    <Button variant="destructive" size="sm" onClick={() => openErrorCenter()}>
                      errors {content.summary.errorCount}
                    </Button>
                  ) : null}
                </div>
              </div>

              {antigravityView === "trajectory" ? (
                <div>
                  <TrajectoryFilterControls
                    filters={trajectoryFilters}
                    onFiltersChange={setTrajectoryFilters}
                    groupCount={executionGroups.length}
                    eventSearch={eventSearch}
                    onEventSearchChange={setEventSearch}
                    searchMatchCount={eventSearchMatchEvents.length}
                    activeMatchIndex={activeSearchMatchIndex}
                    onNavigateMatch={navigateSearchMatchByOffset}
                  />
                  {withInspector(
                    <VirtualizedTrajectoryRows
                      rows={trajectoryRows}
                      onToggleGroup={toggleExecutionGroup}
                      onSelectRow={onSelectRow}
                      selectedRowId={selectedRowId}
                      highlightedRowId={highlightedRowId}
                      scrollToRowId={scrollToRowId}
                      onScrolledToRowId={() => setScrollToRowId(null)}
                      autoOpenDetailsRowId={autoOpenDetailsRowId}
                      autoOpenDetailsToken={autoOpenDetailsToken}
                      onAutoOpenedDetails={(rowId, token) => {
                        if (rowId === autoOpenDetailsRowId && token === autoOpenDetailsToken) setAutoOpenDetailsRowId(null);
                      }}
                      searchQuery={eventSearch}
                    />
                  )}
                </div>
              ) : antigravityView === "transcript" ? (
                <div>
                  <div className="mb-2 text-xs text-muted">
                    Transcript shows user/assistant plus errors. Tools and successful commands are hidden behind a summary row.
                  </div>
                  {withInspector(
                    <VirtualizedTrajectoryRows
                      rows={transcriptRows}
                      onToggleGroup={toggleExecutionGroup}
                      onSelectRow={onSelectRow}
                      selectedRowId={selectedRowId}
                      highlightedRowId={highlightedRowId}
                      scrollToRowId={scrollToRowId}
                      onScrolledToRowId={() => setScrollToRowId(null)}
                      onJumpToTrajectoryEventId={requestJumpToTrajectoryEventId}
                    />
                  )}
                </div>
              ) : (
                withInspector(
                  <div className="max-h-[calc(100vh-290px)] overflow-auto pr-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                      {content.markdown ?? ""}
                    </ReactMarkdown>
                  </div>
                )
              )}
            </div>
          ) : null}

          {selectedId && content?.kind === "trajectory" && content.source === "windsurf" ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>
                    steps{" "}
                    {typeof content.stepOffset === "number"
                      ? `${content.stepOffset}${typeof content.numTotalSteps === "number" ? ` / ${content.numTotalSteps}` : ""}`
                      : content.summary.totalSteps}
                  </Badge>
                  <Badge>events {content.summary.renderedEvents}</Badge>
                  <Badge>thoughts {content.summary.thoughtCount}</Badge>
                  <Badge>tools {content.summary.toolCount + content.summary.commandCount}</Badge>
                  {content.summary.subagentCount > 0 ? (
                    <Badge className="bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                      subagents {content.summary.subagentCount}
                    </Badge>
                  ) : null}
                  {content.summary.errorCount > 0 ? (
                    <Button variant="destructive" size="sm" onClick={() => openErrorCenter()}>
                      errors {content.summary.errorCount}
                    </Button>
                  ) : null}
                </div>
              </div>

              {windsurfView === "trajectory" ? (
                <div>
                  <TrajectoryFilterControls
                    filters={trajectoryFilters}
                    onFiltersChange={setTrajectoryFilters}
                    groupCount={executionGroups.length}
                    eventSearch={eventSearch}
                    onEventSearchChange={setEventSearch}
                    searchMatchCount={eventSearchMatchEvents.length}
                    activeMatchIndex={activeSearchMatchIndex}
                    onNavigateMatch={navigateSearchMatchByOffset}
                  />
                  {withInspector(
                    <VirtualizedTrajectoryRows
                      rows={trajectoryRows}
                      onToggleGroup={toggleExecutionGroup}
                      onSelectRow={onSelectRow}
                      selectedRowId={selectedRowId}
                      highlightedRowId={highlightedRowId}
                      scrollToRowId={scrollToRowId}
                      onScrolledToRowId={() => setScrollToRowId(null)}
                      autoOpenDetailsRowId={autoOpenDetailsRowId}
                      autoOpenDetailsToken={autoOpenDetailsToken}
                      onAutoOpenedDetails={(rowId, token) => {
                        if (rowId === autoOpenDetailsRowId && token === autoOpenDetailsToken) setAutoOpenDetailsRowId(null);
                      }}
                      searchQuery={eventSearch}
                    />
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-xs text-muted">
                    Transcript shows user/assistant plus errors. Tools and successful commands are hidden behind a summary row.
                  </div>
                  {withInspector(
                    <VirtualizedTrajectoryRows
                      rows={transcriptRows}
                      onToggleGroup={toggleExecutionGroup}
                      onSelectRow={onSelectRow}
                      selectedRowId={selectedRowId}
                      highlightedRowId={highlightedRowId}
                      scrollToRowId={scrollToRowId}
                      onScrolledToRowId={() => setScrollToRowId(null)}
                      onJumpToTrajectoryEventId={requestJumpToTrajectoryEventId}
                    />
                  )}
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadConversation("windsurf", selectedId, 0, "trajectory")}
                  disabled={loadingContent}
                >
                  Reload
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => loadMoreWindsurfTrajectory()}
                  disabled={loadingContent || (typeof content.numTotalSteps === "number" && typeof content.stepOffset === "number" && content.stepOffset >= content.numTotalSteps)}
                >
                  Load more
                </Button>
              </div>
            </div>
          ) : null}

          {selectedId && content?.kind === "trajectory" && content.source === "codex" ? (
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>events {content.summary.renderedEvents}</Badge>
                  <Badge>thoughts {content.summary.thoughtCount}</Badge>
                  <Badge>tools {content.summary.toolCount}</Badge>
                  <Badge>commands {content.summary.commandCount}</Badge>
                  {content.summary.subagentCount > 0 ? (
                    <Badge className="bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                      subagents {content.summary.subagentCount}
                    </Badge>
                  ) : null}
                  {content.summary.errorCount > 0 ? (
                    <Button variant="destructive" size="sm" onClick={() => openErrorCenter()}>
                      errors {content.summary.errorCount}
                    </Button>
                  ) : null}
                </div>
                <div className="text-xs text-muted">Codex CLI session (read from .jsonl)</div>
              </div>
              <TrajectoryFilterControls
                filters={trajectoryFilters}
                onFiltersChange={setTrajectoryFilters}
                groupCount={executionGroups.length}
                eventSearch={eventSearch}
                onEventSearchChange={setEventSearch}
                searchMatchCount={eventSearchMatchEvents.length}
                activeMatchIndex={activeSearchMatchIndex}
                onNavigateMatch={navigateSearchMatchByOffset}
              />
              {withInspector(
                <VirtualizedTrajectoryRows
                  rows={trajectoryRows}
                  onToggleGroup={toggleExecutionGroup}
                  onSelectRow={onSelectRow}
                  selectedRowId={selectedRowId}
                  highlightedRowId={highlightedRowId}
                  scrollToRowId={scrollToRowId}
                  onScrolledToRowId={() => setScrollToRowId(null)}
                  autoOpenDetailsRowId={autoOpenDetailsRowId}
                  autoOpenDetailsToken={autoOpenDetailsToken}
                  onAutoOpenedDetails={(rowId, token) => {
                    if (rowId === autoOpenDetailsRowId && token === autoOpenDetailsToken) setAutoOpenDetailsRowId(null);
                  }}
                  searchQuery={eventSearch}
                />
              )}
            </div>
          ) : null}

          {selectedId && content?.kind === "markdown" ? (
            <div className="max-h-[calc(100vh-240px)] overflow-auto pr-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content.markdown}
              </ReactMarkdown>
            </div>
          ) : null}

          {selectedId && content?.kind === "chat" ? (
            <div>
              <div className="mb-2 text-xs text-muted">
                Steps loaded: {content.stepOffset}
                {typeof content.numTotalSteps === "number" ? ` / ${content.numTotalSteps}` : ""}
              </div>
              <div className="flex max-h-[calc(100vh-290px)] flex-col gap-3 overflow-auto pr-1">
                {content.messages.map((m, idx) => (
                  <ChatMessageView key={idx} message={m} />
                ))}
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadConversation("windsurf", selectedId, 0)}
                  disabled={loadingContent}
                >
                  Reload
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => loadMoreWindsurfChat()}
                  disabled={loadingContent || (typeof content.numTotalSteps === "number" && content.stepOffset >= content.numTotalSteps)}
                >
                  Load more
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
