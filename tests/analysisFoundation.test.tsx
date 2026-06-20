import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AnalysisFoundation,
  clearAnalysisRoutedCueState,
  resolveAnalysisNavigationHandoff,
} from "@/components/AnalysisFoundation";
import { resolveAnalysisSessionRootId, type AnalysisHandoff } from "@/lib/analysisFindings";
import type { ProjectEvidenceProviderResult } from "@/lib/projectEvidenceProvider";

function renderAnalysisFoundation(handoff: AnalysisHandoff | null, projectEvidence?: ProjectEvidenceProviderResult | null) {
  return renderToStaticMarkup(
    <AnalysisFoundation
      handoff={handoff}
      projectEvidence={projectEvidence}
      loadingDelayMs={0}
      onOpenAssets={vi.fn()}
      onOpenBackup={vi.fn()}
      onOpenOverview={vi.fn()}
      onOpenSession={vi.fn()}
    />
  );
}

function createProviderResult(input: Partial<ProjectEvidenceProviderResult>): ProjectEvidenceProviderResult {
  return {
    provider: "project-evidence-provider-v1",
    status: "available",
    projectName: "agent-storage-manager",
    rootLabel: "repository root",
    evidenceSource: "repo-local",
    items: [],
    assets: [],
    diagnostics: [],
    ...input,
  };
}

describe("AnalysisFoundation", () => {
  it("renders issue-heavy state without claiming automated remediation", () => {
    const html = renderAnalysisFoundation(null);

    expect(html).toContain("Analysis");
    expect(html).toContain("issue-heavy state");
    expect(html).toContain("Context Health Summary");
    expect(html).toContain("Findings Inventory");
    expect(html).toContain("This foundation does not claim automatic fixes");
  });

  it("renders selected routed-in state from Assets with object context", () => {
    const html = renderAnalysisFoundation({
      origin: "assets",
      subtitle: "Review issue context from Assets: conflicted asset.",
      issueClass: "conflict",
      objectType: "asset",
      assetId: "asset-skill-global-generated",
      issueLabel: "conflicted asset",
    });

    expect(html).toContain("routed analysis");
    expect(html).toContain("from assets");
    expect(html).toContain("Conflicted OpenSpec helper skill");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("Open affected asset");
  });

  it("renders selected non-issue state when handoff targets resolved low-risk finding", () => {
    const html = renderAnalysisFoundation({
      origin: "overview",
      subtitle: "Review traceable project rule baseline.",
      issueClass: "provenance",
      severity: "low",
      objectType: "asset",
      status: "resolved",
      findingId: "finding-project-rule-active",
    });

    expect(html).toContain("selected finding active");
    expect(html).toContain("Project coding rules are active and traceable");
    expect(html).not.toContain("issue-heavy state");
  });

  it("renders normal state when filters match only low-risk unselected findings", () => {
    const html = renderAnalysisFoundation({
      origin: "overview",
      subtitle: "Review low-risk provenance findings.",
      issueClass: "provenance",
      severity: "low",
      status: "resolved",
    });

    expect(html).toContain("Project coding rules are active and traceable");
    expect(html).not.toContain("issue-heavy state");
    expect(html).not.toContain("selected finding active");
  });

  it("renders empty routed-in state without fake findings", () => {
    const html = renderAnalysisFoundation({
      origin: "overview",
      subtitle: "Review high-severity stale findings.",
      issueClass: "stale",
      severity: "high",
      objectType: "asset",
    });

    expect(html).toContain("No findings match the current issue and object context.");
    expect(html).toContain("No findings currently match the routed context.");
    expect(html).not.toContain("Stale review preference memory");
  });

  it("degrades stale handoff safely when the referenced finding is missing", () => {
    const html = renderAnalysisFoundation({
      origin: "overview",
      subtitle: "Review stale findings from project attention.",
      issueClass: "stale",
      findingId: "missing-finding",
    });

    expect(html).toContain("The original routed context could not be selected.");
    expect(html).toContain("Stale review preference memory");
  });

  it("retains session navigation handoff even after routed cue is cleared", () => {
    const handoff: AnalysisHandoff = {
      origin: "sessions",
      subtitle: "Review session evidence.",
      issueClass: "preservation",
      sessionId: "session-command-antigravity-4",
      source: "antigravity",
      rootId: "root-a",
    };

    const navigationHandoff = resolveAnalysisNavigationHandoff(handoff);
    const nextState = clearAnalysisRoutedCueState(navigationHandoff);

    expect(nextState.activeHandoff).toBeNull();
    expect(nextState.navigationHandoff).toEqual(handoff);
    expect(
      resolveAnalysisSessionRootId({
        handoff: nextState.navigationHandoff,
        sessionId: "session-command-antigravity-4",
        source: "antigravity",
      })
    ).toBe("root-a");
  });

  it("only retains navigation handoff for session-scoped routed context", () => {
    expect(
      resolveAnalysisNavigationHandoff({
        origin: "assets",
        subtitle: "Review issue context from Assets: conflicted asset.",
        issueClass: "conflict",
        assetId: "asset-skill-global-generated",
      })
    ).toBeNull();
  });

  it("renders provider diagnostics as bounded findings", () => {
    const html = renderAnalysisFoundation(null, createProviderResult({
      diagnostics: [
        {
          id: "project-evidence-diagnostic-unreadable-agents-md",
          kind: "unreadable",
          severity: "warning",
          path: "AGENTS.md",
          message: "Provider could not read this repo-local allowlisted evidence file.",
        },
      ],
    }));

    expect(html).toContain("provider diagnostics");
    expect(html).toContain("Provider unreadable evidence: AGENTS.md");
    expect(html).toContain("bounded provider diagnostics");
    expect(html).not.toContain("Preserve session evidence before migration cleanup");
  });

  it("renders provider-backed no-current-findings without seed issues", () => {
    const html = renderAnalysisFoundation(null, createProviderResult({
      assets: [],
      diagnostics: [],
    }));

    expect(html).toContain("no current provider findings");
    expect(html).toContain("0");
    expect(html).toContain("No findings match the current issue and object context.");
    expect(html).not.toContain("Stale review preference memory");
  });

  it("labels seed findings as fallback when provider is unavailable", () => {
    const html = renderAnalysisFoundation(null, createProviderResult({ status: "unavailable" }));

    expect(html).toContain("provider unavailable fallback");
    expect(html).toContain("Preserve session evidence before migration cleanup");
  });
});
