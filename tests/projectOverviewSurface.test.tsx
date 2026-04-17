import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ProjectOverviewSurface } from "@/components/ProjectShellClient";
import { deriveProjectOverviewSummary } from "@/lib/projectOverview";

function renderOverview(summary = deriveProjectOverviewSummary()) {
  return renderToStaticMarkup(
    <ProjectOverviewSurface
      summary={summary}
      onRoute={vi.fn()}
    />
  );
}

describe("ProjectOverviewSurface", () => {
  it("renders the governance module spine", () => {
    const html = renderOverview();

    expect(html).toContain("Project-scoped agent context governance");
    expect(html).toContain("Context Snapshot");
    expect(html).toContain("In-Effect Assets");
    expect(html).toContain("Recent Sessions");
    expect(html).toContain("Attention Needed");
    expect(html).toContain("Quick Actions");
  });

  it("renders issue state with Attention Needed before Recent Sessions", () => {
    const html = renderOverview();

    expect(html).toContain("attention state");
    expect(html.indexOf("Attention Needed")).toBeLessThan(html.indexOf("Recent Sessions"));
    expect(html).toContain("Preserve session evidence before migration cleanup");
    expect(html).toContain("Preserve in Backup / Migration");
  });

  it("renders loading state without losing Project Overview identity", () => {
    const html = renderOverview(deriveProjectOverviewSummary({ isLoading: true }));

    expect(html).toContain("Project Overview");
    expect(html).toContain("Loading Project Overview");
    expect(html).toContain("Context Snapshot");
    expect(html).toContain("Quick Actions");
  });

  it("renders no-project-context state with starting routes and explicit zero cues", () => {
    const html = renderOverview(deriveProjectOverviewSummary({
      assets: [],
      findings: [],
      sessions: [],
      backupWorkflows: ["import-backup", "validate-package"],
    }));

    expect(html).toContain("no project context");
    expect(html).toContain("0 sessions");
    expect(html).toContain("0 assets");
    expect(html).toContain("0 findings");
    expect(html).toContain("Import Backup");
    expect(html).toContain("Validate Package");
  });

  it("keeps Overview summary-only and does not expose forbidden detail surfaces", () => {
    const html = renderOverview();

    expect(html).not.toContain("Transcript");
    expect(html).not.toContain("tool output");
    expect(html).not.toContain("Findings Inventory");
    expect(html).not.toContain("Selected Finding");
    expect(html).not.toContain("Workflow Progress");
    expect(html).not.toContain("Confirm");
    expect(html).not.toContain("Execute");
    expect(html).not.toContain("Apply Migration");
    expect(html).not.toContain("Restore Vendor Runtime");
    expect(html).not.toContain("Start Cloud Sync");
    expect(html).not.toContain("Redact Private Data");
  });

  it("frames the page as project-scoped agent context governance", () => {
    const html = renderOverview();

    expect(html).toContain("Project-scoped agent context governance");
    expect(html).not.toContain("command center");
    expect(html).not.toContain("dashboard");
  });
});
