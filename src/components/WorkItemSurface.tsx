"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";

import { canTransitionWorkItemStatus, type WorkItem } from "@/lib/workContinuity";
import HandoffFlow from "@/components/HandoffFlow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Source } from "@/lib/types";

export type WorkItemSurfaceProps = { workItemId: string | null; projectRootPath?: string; onBack(): void; onOpenSessions(): void };

const labels: Record<WorkItem["status"], string> = { captured: "Captured", organized: "Organized", active: "Active", blocked: "Blocked", "ready-to-handoff": "Ready to hand off", completed: "Completed", archived: "Archived" };

export function deriveWorkItemActionAvailability(status: WorkItem["status"]) {
  return {
    canActivate: status !== "active" && canTransitionWorkItemStatus(status, "active"),
    canBlock: canTransitionWorkItemStatus(status, "blocked"),
    canComplete: canTransitionWorkItemStatus(status, "completed"),
  };
}

export default function WorkItemSurface({ workItemId, onBack, onOpenSessions }: WorkItemSurfaceProps) {
  const [item, setItem] = useState<WorkItem | null>(null);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(Boolean(workItemId));
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [attachSource, setAttachSource] = useState<Source>("codex");
  const [attachSessionId, setAttachSessionId] = useState("");
  const [attaching, setAttaching] = useState(false);

  const load = useCallback(async () => {
    if (!workItemId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try { const response = await fetch(`/api/work-items/${encodeURIComponent(workItemId)}`, { cache: "no-store" }); const body = await response.json() as { workItem?: WorkItem; error?: string }; if (!response.ok || !body.workItem) throw new Error(body.error ?? "Unable to load Work Item"); setItem(body.workItem); setGoal(body.workItem.goal.value); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load Work Item"); }
    finally { setLoading(false); }
  }, [workItemId]);
  useEffect(() => { void load(); }, [load]);

  const patch = async (payload: Record<string, unknown>) => {
    if (!workItemId) return;
    setError(null);
    try { const response = await fetch(`/api/work-items/${encodeURIComponent(workItemId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }); const body = await response.json() as { workItem?: WorkItem; error?: string }; if (!response.ok || !body.workItem) throw new Error(body.error ?? "Unable to update Work Item"); setItem(body.workItem); setGoal(body.workItem.goal.value); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update Work Item"); }
  };

  const attachSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workItemId || !attachSessionId.trim() || attaching) return;
    setAttaching(true); setError(null);
    try {
      const response = await fetch(`/api/work-items/${encodeURIComponent(workItemId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ attachSession: { source: attachSource, sessionId: attachSessionId.trim() } }) });
      const body = await response.json() as { workItem?: WorkItem; error?: string };
      if (!response.ok || !body.workItem) throw new Error(body.error ?? "Unable to attach Session");
      setItem(body.workItem); setAttachSessionId(""); setShowAttach(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to attach Session"); }
    finally { setAttaching(false); }
  };

  if (!workItemId) return <Card className="p-6"><h2 className="text-xl font-semibold">Choose a Work Item</h2><p className="mt-2 text-sm text-muted">Open Continue Work to select an item or create a new one.</p><Button className="mt-4" onClick={onBack}>Open Continue Work</Button></Card>;
  if (loading) return <Card className="p-6 text-sm text-muted">Loading Work Item…</Card>;
  if (error && !item) return <Card className="p-6"><p className="text-sm text-danger">{error}</p><Button className="mt-4" onClick={() => void load()}>Retry</Button></Card>;
  if (!item) return null;
  const { canActivate, canBlock, canComplete } = deriveWorkItemActionAvailability(item.status);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>← Continue Work</Button>
        <div className="flex gap-2"><Button variant="outline" onClick={onOpenSessions}>Open Sessions</Button><Button onClick={() => setHandoff((value) => !value)}>{handoff ? "Close handoff" : "Prepare handoff"}</Button></div>
      </div>
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-[0.2em] text-muted">Work Item</div><h2 className="mt-2 text-xl font-semibold">{item.goal.value}</h2><p className="mt-1 text-xs text-muted">{item.project.name ?? item.project.rootPath}</p></div><Badge variant={item.status === "blocked" ? "bad" : item.status === "active" ? "ok" : "default"}>{labels[item.status]}</Badge></div>
        <div className="mt-5 grid gap-3"><label className="text-sm text-muted">Goal<Input value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-1" /></label><div className="flex flex-wrap gap-2"><Button size="sm" disabled={!goal.trim() || (goal.trim() === item.goal.value && item.status !== "captured")} onClick={() => void patch({ goal: goal.trim(), organize: true })}>Save and organize</Button>{canActivate ? <Button size="sm" variant="outline" onClick={() => void patch({ status: "active" })}>{item.status === "blocked" ? "Resume" : "Start work"}</Button> : null}{canBlock ? <Button size="sm" variant="outline" onClick={() => void patch({ status: "blocked" })}>Mark blocked</Button> : null}{canComplete ? <Button size="sm" variant="outline" onClick={() => void patch({ status: "completed" })}>Complete</Button> : null}</div></div>
      </Card>
      {item.progress?.length ? <Card className="p-4"><div className="text-xs uppercase tracking-[0.2em] text-muted">Progress</div><div className="mt-3 grid gap-2">{item.progress.map((entry, index) => <div key={`${entry.value}-${index}`} className="rounded-xl border border-border/60 p-3 text-sm"><Badge variant="default">{entry.kind ?? "context"}</Badge><p className="mt-2 text-muted">{entry.value}</p></div>)}</div></Card> : null}
      {item.context?.length ? <Card className="p-4"><div className="text-xs uppercase tracking-[0.2em] text-muted">Context boundary</div><div className="mt-3 grid gap-2">{item.context.map((entry) => <div key={entry.id} className="rounded-xl border border-border/60 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge variant="default">{entry.source}</Badge><Badge variant="default">{entry.confidence}</Badge><Badge variant="default">{entry.attribution}</Badge></div><p className="mt-2 text-muted">{entry.name ?? entry.id} · {entry.scope}</p></div>)}</div></Card> : null}
      {item.openQuestions?.length ? <Card className="border-amber-400/40 p-4"><div className="text-xs uppercase tracking-[0.2em] text-muted">Open questions</div><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">{item.openQuestions.map((question) => <li key={question.id}>{question.value} <span className="text-xs">({question.confidence})</span></li>)}</ul></Card> : null}
      <Card className="p-4"><div className="text-xs uppercase tracking-[0.2em] text-muted">Evidence boundary</div><p className="mt-2 text-sm leading-6 text-muted">{item.sessionEvidence ? `Session evidence attached (${item.sessionEvidence.events.length} bounded events).` : "No Session evidence is attached. Continuation remains unverified until a source session is captured."}</p><div className="mt-3 flex flex-wrap gap-2"><Badge variant={item.sessionEvidence ? "ok" : "warn"}>{item.sessionEvidence ? "observed evidence" : "missing evidence"}</Badge>{item.repositoryState?.branch ? <Badge variant="default">{item.repositoryState.branch}</Badge> : null}{item.repositoryState?.commit ? <Badge variant="default">{item.repositoryState.commit.slice(0, 12)}</Badge> : null}</div></Card>
      {item.handoffs?.length ? <Card className="p-4"><div className="text-xs uppercase tracking-[0.2em] text-muted">Handoff history</div><div className="mt-3 grid gap-2">{item.handoffs.map((handoff) => <div key={handoff.id} className="rounded-xl border border-border/60 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge variant={handoff.outcome === "failed" ? "bad" : handoff.outcome === "confirmed" ? "ok" : "default"}>{handoff.outcome}</Badge>{handoff.target?.provider ? <Badge variant="default">{handoff.target.provider}</Badge> : null}</div>{handoff.packageHash ? <p className="mt-2 break-all text-xs text-muted">{handoff.packageHash}</p> : null}</div>)}</div></Card> : null}
      <Card className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs uppercase tracking-[0.2em] text-muted">Associated sessions</div><p className="mt-2 text-sm text-muted">{item.sessions?.length ?? (item.sessionEvidence ? 1 : 0)} bounded session{(item.sessions?.length ?? (item.sessionEvidence ? 1 : 0)) === 1 ? "" : "s"} attached.</p></div><Button size="sm" variant="outline" onClick={() => setShowAttach((value) => !value)}>{showAttach ? "Cancel" : "Attach Session"}</Button></div>{item.sessions?.length ? <div className="mt-3 grid gap-2">{item.sessions.map((session) => <div key={`${session.source}-${session.sessionId}`} className="rounded-xl border border-border/60 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge>{session.source}</Badge><Badge>{session.confidence}</Badge></div><p className="mt-2 break-all text-muted">{session.title ?? session.sessionId}</p></div>)}</div> : null}{showAttach ? <form className="mt-4 grid gap-3 rounded-xl border border-border/60 p-3" onSubmit={attachSession}><label className="text-sm text-muted">Provider<select className="mt-1 flex h-9 w-full rounded-md border border-border bg-background px-3 text-sm" value={attachSource} onChange={(event) => setAttachSource(event.target.value as Source)}><option value="codex">Codex</option><option value="cursor">Cursor</option><option value="windsurf">Windsurf</option><option value="antigravity">Antigravity</option></select></label><label className="text-sm text-muted">Session ID<Input className="mt-1" value={attachSessionId} onChange={(event) => setAttachSessionId(event.target.value)} placeholder="Paste a provider session ID" /></label><Button type="submit" size="sm" disabled={!attachSessionId.trim() || attaching}>{attaching ? "Attaching…" : "Attach bounded Session"}</Button></form> : null}</Card>
      {handoff ? <HandoffFlow workItemId={item.id} onComplete={() => setHandoff(false)} /> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
