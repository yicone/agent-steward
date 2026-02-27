"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

import type {
  AntigravityTrajectoryEvent,
  AppConfig,
  ChatMessage,
  ConversationContent,
  ConversationListItem,
  Source,
  SourcesStatus
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

function TrajectoryEventView({ event }: { event: AntigravityTrajectoryEvent }) {
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
  const [antigravityView, setAntigravityView] = useState<"trajectory" | "markdown">("trajectory");
  const [antigravityFilters, setAntigravityFilters] = useState({
    thought: true,
    tool: true,
    command: true,
    status: false
  });

  const selectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return items.find((it) => `${it.rootId}:${it.id}` === selectedKey) ?? null;
  }, [items, selectedKey]);

  const filteredItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.id.toLowerCase().includes(q));
  }, [items, filter]);

  const visibleAntigravityEvents = useMemo(() => {
    if (content?.kind !== "antigravity") return [];
    return content.events.filter((event) => {
      if (event.kind === "thought" && !antigravityFilters.thought) return false;
      if (event.kind === "tool" && !antigravityFilters.tool) return false;
      if (event.kind === "command" && !antigravityFilters.command) return false;
      if (event.kind === "status" && !antigravityFilters.status) return false;
      return true;
    });
  }, [content, antigravityFilters]);

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

  async function loadConversation(nextSource: Source, id: string, stepOffset?: number) {
    setLoadingContent(true);
    setError(null);
    try {
      const qp = nextSource === "windsurf" ? `?stepOffset=${stepOffset ?? 0}` : "";
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

  async function loadMoreWindsurf() {
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

  useEffect(() => {
    refreshConfigAndStatus().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(() => {
    loadList(source).catch(() => {});
    setSelectedKey(null);
    setSelectedId(null);
    setContent(null);
    setAntigravityView("trajectory");
  }, [source]);

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
                  setAntigravityView("trajectory");
                  loadConversation(source, it.id).catch(() => {});
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

          {selectedId && content?.kind === "antigravity" ? (
            <div>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
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
                      className={`btn ${antigravityFilters.thought ? "primary" : ""}`}
                      onClick={() => setAntigravityFilters((prev) => ({ ...prev, thought: !prev.thought }))}
                    >
                      Thoughts
                    </button>
                    <button
                      className={`btn ${antigravityFilters.tool ? "primary" : ""}`}
                      onClick={() => setAntigravityFilters((prev) => ({ ...prev, tool: !prev.tool }))}
                    >
                      Tools
                    </button>
                    <button
                      className={`btn ${antigravityFilters.command ? "primary" : ""}`}
                      onClick={() => setAntigravityFilters((prev) => ({ ...prev, command: !prev.command }))}
                    >
                      Commands
                    </button>
                    <button
                      className={`btn ${antigravityFilters.status ? "primary" : ""}`}
                      onClick={() => setAntigravityFilters((prev) => ({ ...prev, status: !prev.status }))}
                    >
                      Status
                    </button>
                    <span className="muted" style={{ fontSize: 12 }}>
                      Visible: {visibleAntigravityEvents.length}
                    </span>
                  </div>
                  <div className="chat" style={{ maxHeight: "calc(100vh - 330px)", overflow: "auto", paddingRight: 4 }}>
                    {visibleAntigravityEvents.map((event) => (
                      <TrajectoryEventView key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: "calc(100vh - 290px)", overflow: "auto" }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {content.markdown}
                  </ReactMarkdown>
                </div>
              )}
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
                  onClick={() => loadMoreWindsurf()}
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
