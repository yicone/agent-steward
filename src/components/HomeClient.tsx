"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import { summarizeTrajectoryEvents } from "@/lib/parse/trajectory";
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

type ExecutionGroup = {
  id: string;
  label: string;
  events: TrajectoryEvent[];
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
    }
  | {
      id: string;
      type: "actions";
      groupId: string;
      counts: TranscriptHiddenCounts;
      toolEvents: TrajectoryEvent[];
    }
  | {
      id: string;
      type: "hidden_summary";
      groupId: string;
      counts: TranscriptHiddenCounts;
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

function isErrorLikeEvent(event: TrajectoryEvent): boolean {
  if (event.title === "Error") return true;
  if (event.status?.includes("ERROR")) return true;
  if (typeof event.exitCode === "number" && event.exitCode !== 0) return true;
  return false;
}

function isKeyStatusLikeEvent(event: TrajectoryEvent): boolean {
  if (event.kind !== "status") return false;
  if (isErrorLikeEvent(event)) return false;
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
    <span className="pill" data-tone={props.tone} title={props.title}>
      {props.label}
    </span>
  );
}

function ChatMessageView({ message }: { message: ChatMessage }) {
  if (message.role === "tool") {
    return (
      <div className="bubble tool">
        <div className="split">
          <div className="mono muted">{message.title}</div>
          <div className="muted">tool step</div>
        </div>
        <details style={{ marginTop: 8 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>
            payload
          </summary>
          <pre style={{ margin: 0, marginTop: 8, overflowX: "auto" }}>
            {JSON.stringify(message.payload, null, 2)}
          </pre>
        </details>
      </div>
    );
  }
  return <div className={`bubble ${message.role}`}>{message.text}</div>;
}

function TranscriptActionsRow(props: { counts: TranscriptHiddenCounts; toolEvents: TrajectoryEvent[] }) {
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
    <div className="bubble system">
      <details>
        <summary className="muted" style={{ cursor: "pointer" }}>
          Actions ({parts.join(" • ")})
        </summary>
        {props.toolEvents.length ? (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {props.toolEvents.map((event) => (
              <div key={event.id} className="muted" style={{ fontSize: 12 }}>
                <span className="pill">tool</span> <span className="mono">{event.title}</span>{" "}
                <span className="mono" style={{ opacity: 0.8 }}>
                  {event.stepType}
                </span>
                {event.text ? (
                  <div style={{ marginTop: 4, whiteSpace: "pre-wrap", opacity: 0.9 }}>{event.text}</div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
            Switch to Trajectory for tool/command details.
          </div>
        )}
      </details>
    </div>
  );
}

function HiddenSummaryRow(props: { counts: TranscriptHiddenCounts }) {
  const totalHidden =
    props.counts.thoughts +
    props.counts.tools +
    props.counts.commandsHidden +
    props.counts.statusesHidden +
    props.counts.other;

  if (totalHidden <= 0) return null;

  const parts: string[] = [];
  if (props.counts.thoughts) parts.push(`thoughts ${props.counts.thoughts}`);
  if (props.counts.tools) parts.push(`tools ${props.counts.tools}`);
  if (props.counts.commandsHidden) parts.push(`commands ${props.counts.commandsHidden}`);
  if (props.counts.statusesHidden) parts.push(`status ${props.counts.statusesHidden}`);
  if (props.counts.other) parts.push(`other ${props.counts.other}`);

  return (
    <div className="bubble system">
      <div className="split">
        <div className="row" style={{ gap: 8 }}>
          <span className="pill">Hidden</span>
          <span className="muted">{parts.join(" • ")}</span>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Switch to Trajectory for details
        </div>
      </div>
    </div>
  );
}

function TrajectoryEventView({ event }: { event: TrajectoryEvent }) {
  const timeLabel = formatIsoTime(event.completedAt ?? event.createdAt);
  const hasDetails = Boolean(event.output || event.toolCalls?.length);

  return (
    <div className={`bubble ${event.kind}`}>
      <div className="split">
        <div className="row" style={{ gap: 8 }}>
          <span className="pill">{event.title}</span>
          <span className="muted mono" style={{ fontSize: 12 }}>
            {event.stepType}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {timeLabel}
        </div>
      </div>

      {event.commandLine ? (
        <div className="mono" style={{ marginTop: 8, fontSize: 12 }}>
          $ {event.commandLine}
        </div>
      ) : null}

      {event.cwd ? (
        <div className="muted mono" style={{ marginTop: 6, fontSize: 12 }}>
          cwd: {event.cwd}
          {typeof event.exitCode === "number" ? ` • exit=${event.exitCode}` : ""}
        </div>
      ) : null}

      {event.text ? <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{event.text}</div> : null}

      {hasDetails ? (
        <details style={{ marginTop: 8 }}>
          <summary className="muted" style={{ cursor: "pointer" }}>
            details
          </summary>
          {event.toolCalls?.length ? (
            <pre style={{ margin: 0, marginTop: 8, overflowX: "auto" }}>{JSON.stringify(event.toolCalls, null, 2)}</pre>
          ) : null}
          {event.output ? <pre style={{ margin: 0, marginTop: 8, overflowX: "auto" }}>{event.output}</pre> : null}
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
    <div className="trajectory-group-row">
      <button className="btn trajectory-group-btn" onClick={() => props.onToggle(props.row.group.id)}>
        <span className="mono">{props.row.collapsed ? "▸" : "▾"}</span>
        <span>{props.row.group.label}</span>
        <span className="pill">{props.row.group.events.length}</span>
      </button>
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
    <div ref={ref} className="trajectory-virtual-row" style={{ transform: `translateY(${top}px)` }}>
      {children}
    </div>
  );
}

function VirtualizedTrajectoryRows(props: {
  rows: TrajectoryRow[];
  onToggleGroup(groupId: string): void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

  const estimateHeight = 148;
  const overscanPx = 700;

  const offsets = useMemo(() => computeRowOffsets(props.rows, rowHeights, estimateHeight), [props.rows, rowHeights]);
  const totalHeight = useMemo(() => {
    if (props.rows.length === 0) return 0;
    const last = props.rows[props.rows.length - 1]!;
    return offsets[props.rows.length - 1]! + (rowHeights[last.id] ?? estimateHeight);
  }, [props.rows, offsets, rowHeights]);

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
    let high = props.rows.length - 1;
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
  }, [scrollTop, overscanPx, props.rows.length, offsets]);

  const end = useMemo(() => {
    const limit = scrollTop + viewportHeight + overscanPx;
    let idx = start;
    while (idx < props.rows.length) {
      const row = props.rows[idx]!;
      const top = offsets[idx] ?? 0;
      const height = rowHeights[row.id] ?? estimateHeight;
      if (top > limit) break;
      idx += 1;
      if (top + height > limit) break;
    }
    return clamp(idx + 1, 0, props.rows.length);
  }, [start, scrollTop, viewportHeight, overscanPx, props.rows, offsets, rowHeights]);

  const visible = useMemo(
    () =>
      props.rows.slice(start, end).map((row, localIndex) => {
        const index = start + localIndex;
        return {
          row,
          top: offsets[index] ?? 0
        };
      }),
    [props.rows, start, end, offsets]
  );

  return (
    <div ref={containerRef} className="trajectory-virtual">
      <div className="trajectory-virtual-inner" style={{ height: totalHeight }}>
        {visible.map(({ row, top }) => (
          <VirtualMeasuredRow key={row.id} rowId={row.id} top={top} onHeight={updateHeight}>
            {row.type === "group" ? (
              <TrajectoryGroupRow row={row} onToggle={props.onToggleGroup} />
            ) : row.type === "event" ? (
              <TrajectoryEventView event={row.event} />
            ) : row.type === "message" ? (
              <ChatMessageView message={row.message} />
            ) : row.type === "actions" ? (
              <TranscriptActionsRow counts={row.counts} toolEvents={row.toolEvents} />
            ) : (
              <HiddenSummaryRow counts={row.counts} />
            )}
          </VirtualMeasuredRow>
        ))}
      </div>
    </div>
  );
}

export default function HomeClient() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<SourcesStatus | null>(null);
  const [source, setSource] = useState<Source>("antigravity");
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [content, setContent] = useState<ConversationContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [antigravityView, setAntigravityView] = useState<"transcript" | "trajectory" | "markdown">("transcript");
  const [windsurfView, setWindsurfView] = useState<"chat" | "transcript" | "trajectory">("transcript");
  const [trajectoryFilters, setTrajectoryFilters] = useState({
    thought: true,
    tool: true,
    command: true,
    status: false
  });
  const [collapsedExecutionGroups, setCollapsedExecutionGroups] = useState<Record<string, boolean>>({});

  const selectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return items.find((it) => `${it.rootId}:${it.id}` === selectedKey) ?? null;
  }, [items, selectedKey]);

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.id.toLowerCase().includes(q));
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
          if (event.kind === "thought" && !trajectoryFilters.thought) continue;
          if (event.kind === "tool" && !trajectoryFilters.tool) continue;
          if (event.kind === "command" && !trajectoryFilters.command) continue;
          if (event.kind === "status" && !trajectoryFilters.status) continue;
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
  }, [content, executionGroups, collapsedExecutionGroups, trajectoryFilters]);

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
      let pendingToolEvents: TrajectoryEvent[] = [];

      const pushMessage = (groupId: string, message: ChatMessage, stableKey: string) => {
        const last = rows[rows.length - 1];
        if (last && last.type === "message" && last.groupId === groupId && last.message.role === message.role && last.message.role !== "tool") {
          if ("text" in last.message && "text" in message) {
            last.message = { ...last.message, text: `${last.message.text}\n\n${message.text}` };
            return;
          }
        }
        rows.push({
          id: `msg:${groupId}:${stableKey}`,
          type: "message",
          groupId,
          message
        });
      };

      const flushActionsUnderAssistant = (groupId: string, stableKey: string) => {
        if (!hasAnyHiddenTranscriptCounts(hidden)) return;
        rows.push({
          id: `actions:${groupId}:${stableKey}`,
          type: "actions",
          groupId,
          counts: hidden,
          toolEvents: pendingToolEvents
        });
        hidden = buildEmptyTranscriptHiddenCounts();
        pendingToolEvents = [];
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
          continue;
        }

        if (isKeyStatusLikeEvent(event)) {
          const text = event.text ?? event.status ?? event.title;
          pushMessage(group.id, { role: "system", text }, event.id);
          continue;
        }

        // Always surface errors (including tool errors) in Transcript mode.
        if (isErrorLikeEvent(event)) {
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
          pendingToolEvents.push(event);
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
          id: `hidden:${group.id}`,
          type: "hidden_summary",
          groupId: group.id,
          counts: hidden
        });
      }
    }

    return rows;
  }, [content, executionGroups, collapsedExecutionGroups]);

  async function refreshConfigAndStatus() {
    const cfgRes = await fetch("/api/config");
    const cfgJson = (await cfgRes.json()) as ApiConfigResponse;
    setConfig(cfgJson.config);
    setSource(cfgJson.config.ui.defaultSource);

    const stRes = await fetch("/api/sources");
    setStatus((await stRes.json()) as SourcesStatus);
  }

  async function loadList(nextSource: Source) {
    setLoadingList(true);
    setError(null);
    setItems([]);
    try {
      const res = await fetch(`/api/conversations?source=${nextSource}&limit=200&offset=0`);
      const json = (await res.json()) as ApiConversationListResponse;
      if (!res.ok) throw new Error((json as any)?.error ?? "Failed to load conversations");
      setItems(json.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingList(false);
    }
  }

  async function loadConversation(nextSource: Source, id: string, stepOffset?: number, view?: "chat" | "trajectory") {
    setLoadingContent(true);
    setError(null);
    try {
      let qp = "";
      if (nextSource === "windsurf") {
        const sp = new URLSearchParams();
        sp.set("stepOffset", String(stepOffset ?? 0));
        if (view === "trajectory") sp.set("view", "trajectory");
        qp = `?${sp.toString()}`;
      }
      const res = await fetch(`/api/conversations/${nextSource}/${id}${qp}`);
      const json = (await res.json()) as any;
      if (!res.ok) throw new Error(json?.error ?? "Failed to load conversation");
      setContent(json as ConversationContent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setContent(null);
    } finally {
      setLoadingContent(false);
    }
  }

  async function loadMoreWindsurfChat() {
    if (!selectedId || source !== "windsurf" || content?.kind !== "chat") return;
    const currentOffset = content.stepOffset ?? 0;
    const res = await fetch(`/api/conversations/windsurf/${selectedId}?stepOffset=${currentOffset}`);
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
    const res = await fetch(`/api/conversations/windsurf/${selectedId}?stepOffset=${currentOffset}&view=trajectory`);
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
    loadList(source).catch(() => {});
    setSelectedKey(null);
    setSelectedId(null);
    setContent(null);
    setAntigravityView("transcript");
    setWindsurfView("transcript");
    setCollapsedExecutionGroups({});
  }, [source]);

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

  const toggleExecutionGroup = useCallback((groupId: string) => {
    setCollapsedExecutionGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div className="row">
          <div style={{ fontSize: 18, fontWeight: 650 }}>Agent Storage Manager</div>
          {antigravityPill}
          {windsurfPill}
        </div>
        <div className="row">
          <button className="btn" onClick={() => refreshConfigAndStatus()}>
            Refresh
          </button>
          <Link className="btn" href="/settings">
            Settings
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div className="row" style={{ gap: 10 }}>
          <button className={`btn ${source === "antigravity" ? "primary" : ""}`} onClick={() => setSource("antigravity")}>
            Antigravity
          </button>
          <button className={`btn ${source === "windsurf" ? "primary" : ""}`} onClick={() => setSource("windsurf")}>
            Windsurf
          </button>
          <div style={{ flex: 1 }} />
          <input className="input" placeholder="Search by id…" style={{ maxWidth: 360 }} value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          Roots: {config ? config.roots.filter((r) => r.source === source && r.enabled).length : "..."} • Items: {items.length}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div style={{ padding: 12 }}>
            <div className="split">
              <div style={{ fontWeight: 600 }}>Conversations</div>
              <div className="muted">{loadingList ? "Loading…" : ""}</div>
            </div>
          </div>
          <div className="list">
            {filteredItems.map((it) => (
              <div
                key={`${it.rootId}:${it.id}`}
                className="list-item"
                data-selected={selectedKey === `${it.rootId}:${it.id}`}
                onClick={() => {
                  setSelectedKey(`${it.rootId}:${it.id}`);
                  setSelectedId(it.id);
                  setContent(null);
                  setAntigravityView("transcript");
                  setWindsurfView("transcript");
                  setCollapsedExecutionGroups({});
                  loadConversation(source, it.id, 0, source === "windsurf" ? "trajectory" : undefined).catch(() => {});
                }}
                title={it.path}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 650,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                  title={it.title ?? it.id}
                >
                  {it.title ?? it.id}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.cwd ? `Running in ${it.cwd}` : <span className="mono">{it.id}</span>}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  {formatTime(it.mtimeMs)} • {formatBytes(it.sizeBytes)}
                </div>
              </div>
            ))}
            {!loadingList && filteredItems.length === 0 ? (
              <div className="muted" style={{ padding: 12 }}>
                No conversations found for this source. Add roots in Settings.
              </div>
            ) : null}
          </div>
        </div>

        <div className="card" style={{ padding: 12 }}>
          <div className="split viewer-header" style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 600 }}>Viewer</div>
            <div className="muted viewer-header-meta">
              {loadingContent
                ? "Loading…"
                : selectedId
                  ? (
                      <span title={selectedItem?.title ?? selectedId}>
                        {selectedItem?.title ? (
                          <>
                            {selectedItem.title} <span className="mono">({selectedId})</span>
                          </>
                        ) : (
                          <span className="mono">{selectedId}</span>
                        )}
                      </span>
                    )
                  : ""}
            </div>
          </div>

          {error ? (
            <div className="bubble system" style={{ borderColor: "rgba(251, 113, 133, 0.55)", color: "rgba(251,113,133,0.95)" }}>
              {error}
            </div>
          ) : null}

          {selectedId ? (
            <div className="row" style={{ justifyContent: "flex-end", marginBottom: 10 }}>
              <a className="btn" href={`/api/conversations/${source}/${selectedId}/diagnostic`} title="Download diagnostic export (includes raw LS payloads; may contain sensitive data)">
                Diagnostic JSON
              </a>
            </div>
          ) : null}

          {!selectedId ? <div className="muted">Select a conversation on the left.</div> : null}

          {selectedId && source === "windsurf" ? (
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                <button
                  className={`btn ${windsurfView === "chat" ? "primary" : ""}`}
                  onClick={() => {
                    setWindsurfView("chat");
                    setContent(null);
                    setCollapsedExecutionGroups({});
                    loadConversation("windsurf", selectedId, 0, "chat").catch(() => {});
                  }}
                >
                  Chat
                </button>
                <button
                  className={`btn ${windsurfView === "transcript" ? "primary" : ""}`}
                  onClick={() => {
                    setWindsurfView("transcript");
                    if (content?.kind !== "trajectory" || content.source !== "windsurf") {
                      setContent(null);
                      setCollapsedExecutionGroups({});
                      loadConversation("windsurf", selectedId, 0, "trajectory").catch(() => {});
                    }
                  }}
                >
                  Transcript
                </button>
                <button
                  className={`btn ${windsurfView === "trajectory" ? "primary" : ""}`}
                  onClick={() => {
                    setWindsurfView("trajectory");
                    if (content?.kind !== "trajectory" || content.source !== "windsurf") {
                      setContent(null);
                      setCollapsedExecutionGroups({});
                      loadConversation("windsurf", selectedId, 0, "trajectory").catch(() => {});
                    }
                  }}
                >
                  Trajectory
                </button>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {windsurfView === "chat"
                  ? "Legacy chat view"
                  : windsurfView === "trajectory"
                    ? "Process-first view"
                    : "Transcript view (default)"}
              </div>
            </div>
          ) : null}

          {selectedId && content?.kind === "trajectory" && content.source === "antigravity" ? (
            <div>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <button className={`btn ${antigravityView === "transcript" ? "primary" : ""}`} onClick={() => setAntigravityView("transcript")}>
                    Transcript
                  </button>
                  <button className={`btn ${antigravityView === "trajectory" ? "primary" : ""}`} onClick={() => setAntigravityView("trajectory")}>
                    Trajectory
                  </button>
                  <button className={`btn ${antigravityView === "markdown" ? "primary" : ""}`} onClick={() => setAntigravityView("markdown")}>
                    Markdown
                  </button>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="pill">steps {content.summary.totalSteps}</span>
                  <span className="pill">events {content.summary.renderedEvents}</span>
                  <span className="pill">thoughts {content.summary.thoughtCount}</span>
                  <span className="pill">tools {content.summary.toolCount + content.summary.commandCount}</span>
                  {content.summary.errorCount > 0 ? <span className="pill" data-tone="bad">errors {content.summary.errorCount}</span> : null}
                </div>
              </div>

              {antigravityView === "trajectory" ? (
                <div>
                  <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <button
                      className={`btn ${trajectoryFilters.thought ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, thought: !prev.thought }))}
                    >
                      Thoughts
                    </button>
                    <button
                      className={`btn ${trajectoryFilters.tool ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, tool: !prev.tool }))}
                    >
                      Tools
                    </button>
                    <button
                      className={`btn ${trajectoryFilters.command ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, command: !prev.command }))}
                    >
                      Commands
                    </button>
                    <button
                      className={`btn ${trajectoryFilters.status ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, status: !prev.status }))}
                    >
                      Status
                    </button>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Groups: {executionGroups.length}
                    </span>
                  </div>
                  <VirtualizedTrajectoryRows rows={trajectoryRows} onToggleGroup={toggleExecutionGroup} />
                </div>
              ) : antigravityView === "transcript" ? (
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                    Transcript shows user/assistant plus errors. Tools and successful commands are hidden behind a summary row.
                  </div>
                  <VirtualizedTrajectoryRows rows={transcriptRows} onToggleGroup={toggleExecutionGroup} />
                </div>
              ) : (
                <div style={{ maxHeight: "calc(100vh - 290px)", overflow: "auto" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {content.markdown ?? ""}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ) : null}

          {selectedId && content?.kind === "trajectory" && content.source === "windsurf" ? (
            <div>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <span className="pill">
                    steps{" "}
                    {typeof content.stepOffset === "number"
                      ? `${content.stepOffset}${typeof content.numTotalSteps === "number" ? ` / ${content.numTotalSteps}` : ""}`
                      : content.summary.totalSteps}
                  </span>
                  <span className="pill">events {content.summary.renderedEvents}</span>
                  <span className="pill">thoughts {content.summary.thoughtCount}</span>
                  <span className="pill">tools {content.summary.toolCount + content.summary.commandCount}</span>
                  {content.summary.errorCount > 0 ? <span className="pill" data-tone="bad">errors {content.summary.errorCount}</span> : null}
                </div>
              </div>

              {windsurfView === "trajectory" ? (
                <div>
                  <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                    <button
                      className={`btn ${trajectoryFilters.thought ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, thought: !prev.thought }))}
                    >
                      Thoughts
                    </button>
                    <button
                      className={`btn ${trajectoryFilters.tool ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, tool: !prev.tool }))}
                    >
                      Tools
                    </button>
                    <button
                      className={`btn ${trajectoryFilters.command ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, command: !prev.command }))}
                    >
                      Commands
                    </button>
                    <button
                      className={`btn ${trajectoryFilters.status ? "primary" : ""}`}
                      onClick={() => setTrajectoryFilters((prev) => ({ ...prev, status: !prev.status }))}
                    >
                      Status
                    </button>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Groups: {executionGroups.length}
                    </span>
                  </div>
                  <VirtualizedTrajectoryRows rows={trajectoryRows} onToggleGroup={toggleExecutionGroup} />
                </div>
              ) : (
                <div>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                    Transcript shows user/assistant plus errors. Tools and successful commands are hidden behind a summary row.
                  </div>
                  <VirtualizedTrajectoryRows rows={transcriptRows} onToggleGroup={toggleExecutionGroup} />
                </div>
              )}

              <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn" onClick={() => loadConversation("windsurf", selectedId, 0, "trajectory")} disabled={loadingContent}>
                  Reload
                </button>
                <button
                  className="btn primary"
                  onClick={() => loadMoreWindsurfTrajectory()}
                  disabled={loadingContent || (typeof content.numTotalSteps === "number" && typeof content.stepOffset === "number" && content.stepOffset >= content.numTotalSteps)}
                >
                  Load more
                </button>
              </div>
            </div>
          ) : null}

          {selectedId && content?.kind === "markdown" ? (
            <div style={{ maxHeight: "calc(100vh - 240px)", overflow: "auto" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {content.markdown}
              </ReactMarkdown>
            </div>
          ) : null}

          {selectedId && content?.kind === "chat" ? (
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                Steps loaded: {content.stepOffset}
                {typeof content.numTotalSteps === "number" ? ` / ${content.numTotalSteps}` : ""}
              </div>
              <div className="chat" style={{ maxHeight: "calc(100vh - 290px)", overflow: "auto", paddingRight: 4 }}>
                {content.messages.map((m, idx) => (
                  <ChatMessageView key={idx} message={m} />
                ))}
              </div>
              <div className="row" style={{ justifyContent: "flex-end", marginTop: 12 }}>
                <button className="btn" onClick={() => loadConversation("windsurf", selectedId, 0)} disabled={loadingContent}>
                  Reload
                </button>
                <button
                  className="btn primary"
                  onClick={() => loadMoreWindsurfChat()}
                  disabled={loadingContent || (typeof content.numTotalSteps === "number" && content.stepOffset >= content.numTotalSteps)}
                >
                  Load more
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
