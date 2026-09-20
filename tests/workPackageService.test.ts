import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createWorkItem } from "../src/lib/server/workItemStore";
import { createWorkPackage, preflightWorkPackage } from "../src/lib/server/workPackageService";
import { WORK_ITEM_SCHEMA_VERSION, type WorkItem } from "../src/lib/workContinuity";

let root: string;
const originalItemRoot = process.env.AGENT_STEWARD_WORK_ITEM_ROOT;
const originalPackageRoot = process.env.AGENT_STEWARD_WORK_PACKAGE_ROOT;

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  const now = "2026-09-19T01:00:00.000Z";
  return {
    schemaVersion: WORK_ITEM_SCHEMA_VERSION,
    id: "work-package-test",
    project: { rootPath: root },
    goal: { value: "Fix login timeout", confidence: "verified", source: "user", observedAt: now },
    status: "organized",
    createdAt: now,
    updatedAt: now,
    evidence: [{ id: "session-1", kind: "session", source: "codex", locator: "session-1", confidence: "observed", observedAt: now }],
    ...overrides,
  };
}

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "asm-work-package-"));
  process.env.AGENT_STEWARD_WORK_ITEM_ROOT = path.join(root, "items");
  process.env.AGENT_STEWARD_WORK_PACKAGE_ROOT = path.join(root, "packages");
  await fs.mkdir(path.join(root, ".git"), { recursive: true });
});

afterEach(async () => {
  if (originalItemRoot === undefined) delete process.env.AGENT_STEWARD_WORK_ITEM_ROOT;
  else process.env.AGENT_STEWARD_WORK_ITEM_ROOT = originalItemRoot;
  if (originalPackageRoot === undefined) delete process.env.AGENT_STEWARD_WORK_PACKAGE_ROOT;
  else process.env.AGENT_STEWARD_WORK_PACKAGE_ROOT = originalPackageRoot;
  await fs.rm(root, { recursive: true, force: true });
});

describe("work package service", () => {
  it("allows a manual package with an explicit missing evidence warning", async () => {
    const item = makeWorkItem({ id: "manual-package", evidence: [] });
    await createWorkItem(item);
    const preflight = await preflightWorkPackage(item, { targetProvider: "codex" });
    expect(preflight.status).toBe("ready_with_warnings");
    expect(preflight.missing).toContain("session evidence");
  });

  it("writes canonical, generic, and Codex projections with a hash", async () => {
    const item = makeWorkItem({ id: "package-create" });
    await createWorkItem(item);
    const created = await createWorkPackage(item.id, { targetProvider: "codex", includeEvidence: true });
    expect(created.package.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.package.projections).toHaveProperty("markdown");
    expect(created.package.projections).toHaveProperty("json");
    expect(created.package.projections).toHaveProperty("codex");
    expect(await fs.readFile(created.codexPath, "utf8")).toContain("does not inject");
  });

  it("keeps the default package summary-only", async () => {
    const item = makeWorkItem({ id: "summary-only", sessionEvidence: {
      schemaVersion: "session-record/v1",
      sessionId: "session-1",
      source: "codex",
      capturedAt: "2026-09-19T01:00:00.000Z",
      events: [{ id: "event-1", text: "private transcript" }],
    } });
    await createWorkItem(item);
    const created = await createWorkPackage(item.id, { targetProvider: "codex" });
    expect(created.package.workItem.sessionEvidence).toBeUndefined();
    expect(created.package.evidence?.[0]?.embedded).toBe(false);
  });

  it("omits embedded evidence snapshots from a summary-only package", async () => {
    const item = makeWorkItem({ id: "summary-only-snapshots", sessionEvidenceSnapshots: [{
      schemaVersion: "session-record/v1", sessionId: "session-1", source: "codex", capturedAt: "2026-09-19T01:00:00.000Z", events: [{ id: "event-1", text: "private transcript" }],
    }] });
    await createWorkItem(item);
    const created = await createWorkPackage(item.id, { targetProvider: "codex" });
    expect(created.package.workItem.sessionEvidence).toBeUndefined();
    expect(created.package.workItem.sessionEvidenceSnapshots).toBeUndefined();
  });

  it("redacts secrets and local URLs before writing package content", async () => {
    const item = makeWorkItem({
      id: "package-redaction",
      progress: [{ value: "Use token=secret123 at http://localhost:3000/debug", confidence: "observed", kind: "current" }],
    });
    await createWorkItem(item);
    const created = await createWorkPackage(item.id, { targetProvider: "codex", includeEvidence: true });
    const raw = await fs.readFile(created.jsonPath, "utf8");
    expect(raw).not.toContain("secret123");
    expect(raw).toContain("REDACTED");
    expect(created.package.redaction?.count).toBeGreaterThan(0);
  });
});
