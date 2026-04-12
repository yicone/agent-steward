"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import AssetsFoundation from "@/components/AssetsFoundation";
import HomeClient, { type HomeClientAssetHandoff, type HomeClientExternalSelection } from "@/components/HomeClient";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssetsHandoff, ContextAssetScope, ContextAssetStatus, ContextAssetSubtype } from "@/lib/contextAssets";
import { cancelPendingUrlSync } from "@/lib/urlState";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/types";

export type ProjectShellPage = "overview" | "sessions" | "assets" | "analysis" | "backup";

type ProjectShellNavItem = {
  id: ProjectShellPage;
  label: string;
  eyebrow: string;
};

type PlaceholderCue = {
  title: string;
  body: string;
};

const NAV_ITEMS: ProjectShellNavItem[] = [
  { id: "overview", label: "Project Overview", eyebrow: "govern" },
  { id: "sessions", label: "Sessions", eyebrow: "evidence" },
  { id: "assets", label: "Assets", eyebrow: "context" },
  { id: "analysis", label: "Analysis", eyebrow: "insight" },
  { id: "backup", label: "Backup / Migration", eyebrow: "workflow" },
];

export function resolveInitialProjectShellPage(search: string): ProjectShellPage {
  const params = new URLSearchParams(search);
  return params.has("id") || params.has("source") ? "sessions" : "overview";
}

export function buildExternalSessionSelection(input: {
  requestId: number;
  sessionId: string;
  source: Source;
  rootId?: string;
}): HomeClientExternalSelection {
  return {
    requestId: input.requestId,
    sessionId: input.sessionId,
    source: input.source,
    ...(input.rootId ? { rootId: input.rootId } : {}),
  };
}

export function buildAssetsHandoffFromSession(input: HomeClientAssetHandoff): AssetsHandoff {
  return {
    origin: "sessions",
    subtitle: "Continue reviewing reusable context from the selected session.",
    continueLabel: "Inspect the routed subtype, then refine scope or selection if you need a different reusable asset.",
    returnLabel: "Return to the originating session if you need more evidence.",
    subtype: input.subtype,
    sessionId: input.sessionId,
  };
}

export function buildAssetsHandoffFromOverview(input: {
  subtitle: string;
  subtype?: ContextAssetSubtype;
  scope?: ContextAssetScope;
  status?: ContextAssetStatus;
  assetId?: string;
  issueLabel?: string;
}): AssetsHandoff {
  return {
    origin: "overview",
    subtitle: input.subtitle,
    continueLabel: "Start from the overview context, then inspect the matching reusable asset or adjust filters without losing the project-level framing.",
    returnLabel: "Return to Project Overview when the broader project picture matters again.",
    subtype: input.subtype,
    scope: input.scope,
    status: input.status,
    assetId: input.assetId,
    issueLabel: input.issueLabel,
  };
}

export function buildAssetsHandoffFromAnalysis(input: {
  subtitle: string;
  subtype?: ContextAssetSubtype;
  status?: ContextAssetStatus;
  assetId?: string;
  issueLabel: string;
}): AssetsHandoff {
  return {
    origin: "analysis",
    subtitle: input.subtitle,
    continueLabel: "Keep the issue framing visible until you intentionally change subtype, scope, or object focus.",
    returnLabel: "Return to Analysis to continue grouped interpretation after object review.",
    subtype: input.subtype,
    status: input.status,
    assetId: input.assetId,
    issueLabel: input.issueLabel,
  };
}

const SESSION_VIEWER_QUERY_KEYS = [
  "source",
  "id",
  "rootId",
  "view",
  "ft",
  "stepType",
  "expanded",
  "row",
  "inspector",
  "includeCleared",
] as const;

export function stripSessionViewerSearchParams(search: string): string {
  const params = new URLSearchParams(search);
  let changed = false;

  for (const key of SESSION_VIEWER_QUERY_KEYS) {
    if (!params.has(key)) continue;
    params.delete(key);
    changed = true;
  }

  if (!changed) return search;

  const next = params.toString();
  return next ? `?${next}` : "";
}

export function buildAssetsFoundationInstanceKey(handoff: AssetsHandoff | null): string {
  if (!handoff) return "assets:no-handoff";

  return [
    "assets",
    handoff.origin,
    handoff.subtype ?? "all-subtypes",
    handoff.scope ?? "all-scopes",
    handoff.status ?? "all-statuses",
    handoff.assetId ?? "no-asset",
    handoff.sessionId ?? "no-session",
    handoff.issueLabel ?? "no-issue",
  ].join(":");
}

function clearSessionViewerUrlState(): void {
  if (typeof window === "undefined") return;

  cancelPendingUrlSync();

  const nextSearch = stripSessionViewerSearchParams(window.location.search);
  if (nextSearch === window.location.search) return;

  const url = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", url);
}

function ProjectOverviewSurface(props: {
  onNavigate(page: ProjectShellPage): void;
  onOpenAssets(handoff: AssetsHandoff): void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="ok">Project-first</Badge>
            <Badge variant="default">local context</Badge>
          </div>
          <h2 className="text-xl font-semibold">Project context command surface</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            This foundation view frames the app around a local project and routes into evidence, context assets,
            analysis, and backup workflows. It intentionally avoids inventing aggregate findings before the underlying
            data contracts exist.
          </p>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">In-Effect Assets</div>
            <h3 className="mt-2 font-semibold">Project-level reusable assets route into a bounded object view</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Start from in-effect or scope-oriented asset context without turning the overview into a hidden inventory.
              The Assets page keeps subtype, scope, provenance, and usage visible while you inspect the routed object.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  props.onOpenAssets(
                    buildAssetsHandoffFromOverview({
                      subtitle: "Review project-scoped rules that are currently in effect.",
                      subtype: "rule",
                      scope: "project",
                      assetId: "asset-rule-project-codex",
                    })
                  )
                }
              >
                Review In-Effect Rules
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  props.onOpenAssets(
                    buildAssetsHandoffFromOverview({
                      subtitle: "Inspect stale memory items that may need cleanup.",
                      subtype: "memory",
                      status: "stale",
                      issueLabel: "stale asset",
                    })
                  )
                }
              >
                Review Stale Memory
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Attention Needed</div>
            <h3 className="mt-2 font-semibold">Diagnostics and unresolved context issues stay routed</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use the Sessions page for current source diagnostics and session evidence. Future analysis summaries will
              appear here only after they can route to a concrete object or workflow.
            </p>
            <Button className="mt-4" variant="outline" size="sm" onClick={() => props.onNavigate("sessions")}>
              Review Sessions
            </Button>
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Quick Routes</div>
        <div className="mt-4 space-y-2">
          <Button
            className="w-full justify-start"
            variant="outline"
            size="sm"
            onClick={() =>
              props.onOpenAssets(
                buildAssetsHandoffFromOverview({
                  subtitle: "Inspect reusable context assets across the current project scope.",
                  subtype: "rule",
                })
              )
            }
          >
            Inspect context assets
          </Button>
          <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => props.onNavigate("analysis")}>
            Review analysis
          </Button>
          <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => props.onNavigate("backup")}>
            Start backup / migration
          </Button>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          Assets is now a bounded foundation surface. Analysis and Backup / Migration remain placeholders, and working
          session backup remains available from a selected session.
        </p>
      </Card>
    </div>
  );
}

function PlaceholderSurface(props: {
  title: string;
  label: string;
  body: string;
  preservedPath: string;
  onNavigateSessions: () => void;
  cue?: PlaceholderCue;
  actionLabel?: string;
  onAction?(): void;
}) {
  return (
    <Card className="p-5">
      {props.cue ? (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent/8 p-4 text-sm text-muted">
          <div className="font-medium text-foreground">{props.cue.title}</div>
          <div className="mt-1 leading-6">{props.cue.body}</div>
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="default">{props.label}</Badge>
        <Badge variant="warn">foundation placeholder</Badge>
      </div>
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{props.body}</p>
      <div className="mt-5 rounded-lg border border-border/70 bg-background/35 p-4 text-sm text-muted">
        Current working path: {props.preservedPath}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {props.onAction && props.actionLabel ? (
          <Button variant="outline" size="sm" onClick={props.onAction}>
            {props.actionLabel}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={props.onNavigateSessions}>
          Return to Sessions
        </Button>
      </div>
    </Card>
  );
}

export default function ProjectShellClient() {
  const [activePage, setActivePage] = useState<ProjectShellPage>("overview");
  const [externalSelection, setExternalSelection] = useState<HomeClientExternalSelection | null>(null);
  const [assetsHandoff, setAssetsHandoff] = useState<AssetsHandoff | null>(null);
  const [analysisCue, setAnalysisCue] = useState<PlaceholderCue | null>(null);
  const [backupCue, setBackupCue] = useState<PlaceholderCue | null>(null);

  const leaveSessionsSurface = useCallback(() => {
    clearSessionViewerUrlState();
    setExternalSelection(null);
  }, []);

  useEffect(() => {
    setActivePage(resolveInitialProjectShellPage(window.location.search));
  }, []);

  const handleSearchSelect = useCallback((sessionId: string, source: Source, rootId?: string) => {
    setAssetsHandoff(null);
    setAnalysisCue(null);
    setBackupCue(null);
    setActivePage("sessions");
    setExternalSelection((prev) =>
      buildExternalSessionSelection({
        requestId: (prev?.requestId ?? 0) + 1,
        sessionId,
        source,
        rootId,
      })
    );
  }, []);

  const handleNavigate = useCallback((page: ProjectShellPage) => {
    if (page !== "sessions") leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisCue(null);
    setBackupCue(null);
    setActivePage(page);
  }, [leaveSessionsSurface]);

  const handleOpenAssets = useCallback((handoff: AssetsHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(handoff);
    setAnalysisCue(null);
    setBackupCue(null);
    setActivePage("assets");
  }, [leaveSessionsSurface]);

  const handleOpenAssetsFromSession = useCallback((handoff: HomeClientAssetHandoff) => {
    leaveSessionsSurface();
    setAssetsHandoff(buildAssetsHandoffFromSession(handoff));
    setAnalysisCue(null);
    setBackupCue(null);
    setActivePage("assets");
  }, [leaveSessionsSurface]);

  const handleOpenSessionFromAssets = useCallback((selection: { sessionId: string; source: Source; rootId?: string }) => {
    setAssetsHandoff(null);
    setAnalysisCue(null);
    setBackupCue(null);
    setActivePage("sessions");
    setExternalSelection((prev) =>
      buildExternalSessionSelection({
        requestId: (prev?.requestId ?? 0) + 1,
        sessionId: selection.sessionId,
        source: selection.source,
        rootId: selection.rootId,
      })
    );
  }, []);

  const handleOpenAnalysisFromAssets = useCallback((context: {
    issueLabel: string;
    assetId?: string;
    subtype?: ContextAssetSubtype;
    status?: ContextAssetStatus;
  }) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setBackupCue(null);
    setAnalysisCue({
      title: "Routed from Assets",
      body: `Issue focus: ${context.issueLabel}. ${context.subtype ? `Subtype: ${context.subtype}. ` : ""}${context.status ? `Status: ${context.status}.` : ""}`.trim(),
    });
    setActivePage("analysis");
  }, [leaveSessionsSurface]);

  const handleOpenBackupFromAssets = useCallback((context: { assetId?: string; subtype?: ContextAssetSubtype }) => {
    leaveSessionsSurface();
    setAssetsHandoff(null);
    setAnalysisCue(null);
    setBackupCue({
      title: "Routed from Assets",
      body: `Prepare bounded backup or migration work${context.subtype ? ` for ${context.subtype} assets` : ""}${context.assetId ? ` starting from ${context.assetId}` : ""}. Workflow execution still belongs to Backup / Migration.`,
    });
    setActivePage("backup");
  }, [leaveSessionsSurface]);

  const activeNav = NAV_ITEMS.find((item) => item.id === activePage) ?? NAV_ITEMS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 p-4">
        <header className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold">Agent Context Insightor</h1>
                <Badge variant="ok">local-first</Badge>
                <Badge variant="default">project shell</Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                Project view for agent sessions, context assets, analysis, and backup workflows.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <GlobalSearch onSelect={handleSearchSelect} />
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">Settings</Link>
              </Button>
            </div>
          </div>

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Project sections">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={cn(
                  "min-w-fit rounded-xl border px-3 py-2 text-left transition-colors",
                  item.id === activePage
                    ? "border-accent/70 bg-accent/15 text-foreground"
                    : "border-border/60 bg-background/30 text-muted hover:border-accent/40 hover:text-foreground"
                )}
                aria-current={item.id === activePage ? "page" : undefined}
              >
                <div className="text-[10px] uppercase tracking-[0.18em] opacity-75">{item.eyebrow}</div>
                <div className="text-sm font-medium">{item.label}</div>
              </button>
            ))}
          </nav>
        </header>

        <main className="min-w-0">
          {activePage !== "sessions" ? (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-muted">Current Surface</div>
                <div className="font-semibold">{activeNav.label}</div>
              </div>
              <Badge variant="default">{activeNav.eyebrow}</Badge>
            </div>
          ) : null}

          {activePage === "overview" ? <ProjectOverviewSurface onNavigate={handleNavigate} onOpenAssets={handleOpenAssets} /> : null}
          {activePage === "sessions" ? (
            <HomeClient
              chrome="embedded"
              externalSelection={externalSelection}
              onOpenAssetsForSession={handleOpenAssetsFromSession}
            />
          ) : null}
          {activePage === "assets" ? (
            <AssetsFoundation
              key={buildAssetsFoundationInstanceKey(assetsHandoff)}
              handoff={assetsHandoff}
              onOpenSession={handleOpenSessionFromAssets}
              onOpenAnalysis={handleOpenAnalysisFromAssets}
              onOpenBackup={handleOpenBackupFromAssets}
            />
          ) : null}
          {activePage === "analysis" ? (
            <PlaceholderSurface
              title="Analysis"
              label="interpretation"
              body="Analysis will summarize context issues and route each finding to a concrete object or workflow. This placeholder avoids creating a findings inventory before analysis contracts exist."
              preservedPath="Use Sessions inspector and error center for current evidence-driven investigation."
              onNavigateSessions={() => handleNavigate("sessions")}
              cue={analysisCue ?? undefined}
              {...(analysisCue
                ? {
                    actionLabel: "Review affected assets",
                    onAction: () =>
                      handleOpenAssets(
                        buildAssetsHandoffFromAnalysis({
                          subtitle: "Review the affected reusable asset class from Analysis.",
                          subtype: "skill",
                          status: "conflicted",
                          assetId: "asset-skill-global-generated",
                          issueLabel: "conflicted asset",
                        })
                      ),
                  }
                : {})}
            />
          ) : null}
          {activePage === "backup" ? (
            <PlaceholderSurface
              title="Backup / Migration"
              label="restricted workflow"
              body="Project-level backup and migration workflows will live here once bundle and migration contracts are implemented. Existing direct session backup remains inside selected Sessions."
              preservedPath="Open a session and use its Backup Session action for current supported backup behavior."
              onNavigateSessions={() => handleNavigate("sessions")}
              cue={backupCue ?? undefined}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
