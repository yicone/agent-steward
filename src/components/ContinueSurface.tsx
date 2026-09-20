"use client";

import React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { WorkItem } from "@/lib/workContinuity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type ContinueSurfaceProps = {
  projectRootPath?: string;
  onOpenWorkItem(id: string): void;
};

const statusLabels: Record<WorkItem["status"], string> = {
  captured: "Captured", organized: "Organized", active: "Active", blocked: "Blocked",
  "ready-to-handoff": "Ready to hand off", completed: "Completed", archived: "Archived",
};

function statusVariant(status: WorkItem["status"]): "default" | "ok" | "warn" | "bad" {
  if (status === "active" || status === "ready-to-handoff") return "ok";
  if (status === "blocked") return "bad";
  if (status === "captured") return "warn";
  return "default";
}

function normalizeComparablePath(input: string): string {
  return input.replaceAll("\\", "/").replace(/\/+$/, "");
}

function WorkItemCard({ item, onOpen }: { item: WorkItem; onOpen(id: string): void }) {
  const latestProgress = item.progress?.find((entry) => entry.kind === "current") ?? item.progress?.[0];
  const project = item.project.name ?? item.project.rootPath;
  return (
    <button type="button" onClick={() => onOpen(item.id)} className="w-full text-left">
      <Card className="p-4 transition-colors hover:border-accent/50 hover:bg-background/30">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{item.goal.value}</div>
            <div className="mt-1 truncate text-xs text-muted">{project}</div>
          </div>
          <Badge variant={statusVariant(item.status)}>{statusLabels[item.status]}</Badge>
        </div>
        {latestProgress ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted">{latestProgress.value}</p> : null}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
          <span>{item.evidence?.length ?? 0} evidence refs</span>
          <span>{item.handoffs?.length ?? 0} handoffs</span>
          {item.repositoryState?.branch ? <span>branch: {item.repositoryState.branch}</span> : null}
        </div>
      </Card>
    </button>
  );
}

export default function ContinueSurface(props: ContinueSurfaceProps) {
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [goal, setGoal] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/work-items", { cache: "no-store" });
      const body = (await response.json()) as { workItems?: WorkItem[]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to load Work Items");
      setItems(body.workItems ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Work Items");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createWorkItem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextGoal = goal.trim();
    if (!nextGoal || !props.projectRootPath || creating) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/work-items", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectRootPath: props.projectRootPath, goal: nextGoal }),
      });
      const body = (await response.json()) as { workItem?: WorkItem; error?: string };
      if (!response.ok || !body.workItem) throw new Error(body.error ?? "Unable to create Work Item");
      setGoal("");
      setShowCreateForm(false);
      props.onOpenWorkItem(body.workItem.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create Work Item");
    } finally {
      setCreating(false);
    }
  };

  const visible = useMemo(() => props.projectRootPath
    ? items.filter((item) => normalizeComparablePath(item.project.rootPath) === normalizeComparablePath(props.projectRootPath!))
    : items, [items, props.projectRootPath]);
  const groups = [
    { title: "Resume now", items: visible.filter((item) => ["active", "organized", "ready-to-handoff"].includes(item.status)) },
    { title: "Needs attention", items: visible.filter((item) => item.status === "blocked") },
    { title: "Recently captured", items: visible.filter((item) => item.status === "captured") },
    { title: "History", items: visible.filter((item) => ["completed", "archived"].includes(item.status)) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Continuity</div>
            <h2 className="mt-2 text-xl font-semibold">Continue Work</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Work Items are the durable thread between sessions and agent providers. Open one to verify what is known before handing it off.</p>
          </div>
          <Button onClick={() => setShowCreateForm((value) => !value)}>{showCreateForm ? "Cancel" : "Create Work Item"}</Button>
        </div>
        {showCreateForm ? (
          <form className="mt-5 grid gap-3 rounded-xl border border-border/70 bg-background/30 p-4" onSubmit={createWorkItem}>
            <label className="text-sm text-muted" htmlFor="new-work-item-goal">
              What do you want to continue?
              <Input
                id="new-work-item-goal"
                className="mt-1"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                placeholder="Describe the work in one sentence"
                autoFocus
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={!goal.trim() || !props.projectRootPath || creating}>
                {creating ? "Creating…" : "Create and organize later"}
              </Button>
              <span className="text-xs text-muted">The new item starts as Captured until you confirm its boundary.</span>
            </div>
          </form>
        ) : null}
      </Card>
      {loading ? <Card className="p-5 text-sm text-muted">Loading local Work Items…</Card> : null}
      {error ? <Card className="border-amber-400/40 p-5"><p className="text-sm text-amber-200">{error}</p><Button className="mt-3" size="sm" onClick={() => void load()}>Retry</Button></Card> : null}
      {!loading && !error && groups.length === 0 ? <Card className="p-6"><h3 className="font-medium">No Work Items yet</h3><p className="mt-2 text-sm leading-6 text-muted">Capture a goal from a session or create one manually to make the next continuation explicit.</p></Card> : null}
      {groups.map((group) => <section key={group.title} className="grid gap-3"><div className="text-xs uppercase tracking-[0.2em] text-muted">{group.title}</div><div className="grid gap-3 lg:grid-cols-2">{group.items.map((item) => <WorkItemCard key={item.id} item={item} onOpen={props.onOpenWorkItem} />)}</div></section>)}
    </div>
  );
}
