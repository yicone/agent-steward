"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";

import HomeClient, { type HomeClientExternalSelection } from "@/components/HomeClient";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Source } from "@/lib/types";

export type ProjectShellPage = "overview" | "sessions" | "assets" | "analysis" | "backup";

type ProjectShellNavItem = {
  id: ProjectShellPage;
  label: string;
  eyebrow: string;
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

function ProjectOverviewSurface({ onNavigate }: { onNavigate(page: ProjectShellPage): void }) {
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
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Attention Needed</div>
            <h3 className="mt-2 font-semibold">Diagnostics and unresolved context issues stay routed</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Use the Sessions page for current source diagnostics and session evidence. Future analysis summaries will
              appear here only after they can route to a concrete object or workflow.
            </p>
            <Button className="mt-4" size="sm" onClick={() => onNavigate("sessions")}>
              Review Sessions
            </Button>
          </Card>

          <Card className="p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-muted">Recent Evidence</div>
            <h3 className="mt-2 font-semibold">Session viewer remains the active evidence workbench</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Existing transcript, trajectory, inspector, error center, diagnostics, and direct session backup behavior
              are preserved under Sessions while the project shell is introduced.
            </p>
            <Button className="mt-4" variant="outline" size="sm" onClick={() => onNavigate("sessions")}>
              Open Evidence Workbench
            </Button>
          </Card>
        </div>
      </div>

      <Card className="p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted">Quick Routes</div>
        <div className="mt-4 space-y-2">
          <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => onNavigate("assets")}>
            Inspect context assets
          </Button>
          <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => onNavigate("analysis")}>
            Review analysis
          </Button>
          <Button className="w-full justify-start" variant="outline" size="sm" onClick={() => onNavigate("backup")}>
            Start backup / migration
          </Button>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted">
          These routes are bounded placeholders in this change. Working session backup remains available from a selected
          session.
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
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="default">{props.label}</Badge>
        <Badge variant="warn">foundation placeholder</Badge>
      </div>
      <h2 className="text-xl font-semibold">{props.title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{props.body}</p>
      <div className="mt-5 rounded-lg border border-border/70 bg-background/35 p-4 text-sm text-muted">
        Current working path: {props.preservedPath}
      </div>
      <Button className="mt-5" variant="outline" size="sm" onClick={props.onNavigateSessions}>
        Return to Sessions
      </Button>
    </Card>
  );
}

export default function ProjectShellClient() {
  const [activePage, setActivePage] = useState<ProjectShellPage>("overview");
  const [externalSelection, setExternalSelection] = useState<HomeClientExternalSelection | null>(null);

  useEffect(() => {
    setActivePage(resolveInitialProjectShellPage(window.location.search));
  }, []);

  const handleSearchSelect = useCallback((sessionId: string, source: Source, rootId?: string) => {
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
                onClick={() => setActivePage(item.id)}
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

          {activePage === "overview" ? <ProjectOverviewSurface onNavigate={setActivePage} /> : null}
          {activePage === "sessions" ? (
            <HomeClient chrome="embedded" externalSelection={externalSelection} />
          ) : null}
          {activePage === "assets" ? (
            <PlaceholderSurface
              title="Assets"
              label="context inventory"
              body="Rules, memory, skills, and commands will be organized here by scope, source, status, provenance, and in-effect usage. This placeholder does not claim inventory completeness yet."
              preservedPath="Use Sessions for source evidence and session-level extraction until asset contracts are implemented."
              onNavigateSessions={() => setActivePage("sessions")}
            />
          ) : null}
          {activePage === "analysis" ? (
            <PlaceholderSurface
              title="Analysis"
              label="interpretation"
              body="Analysis will summarize context issues and route each finding to a concrete object or workflow. This placeholder avoids creating a findings inventory before analysis contracts exist."
              preservedPath="Use Sessions inspector and error center for current evidence-driven investigation."
              onNavigateSessions={() => setActivePage("sessions")}
            />
          ) : null}
          {activePage === "backup" ? (
            <PlaceholderSurface
              title="Backup / Migration"
              label="restricted workflow"
              body="Project-level backup and migration workflows will live here once bundle and migration contracts are implemented. Existing direct session backup remains inside selected Sessions."
              preservedPath="Open a session and use its Backup Session action for current supported backup behavior."
              onNavigateSessions={() => setActivePage("sessions")}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}
