import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const codexConversation = vi.hoisted(() => vi.fn());
const codexRaw = vi.hoisted(() => vi.fn());
const antigravityConversation = vi.hoisted(() => vi.fn());
const cursorConversation = vi.hoisted(() => vi.fn());
const windsurfTrajectory = vi.hoisted(() => vi.fn());
const metaMap = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/codex", () => ({
  getCodexConversation: (...args: unknown[]) => codexConversation(...args),
  getCodexRawContent: (...args: unknown[]) => codexRaw(...args),
  validateRootId: (value: string | null) => value?.trim() || undefined
}));
vi.mock("@/lib/server/antigravity", () => ({ getAntigravityConversation: (...args: unknown[]) => antigravityConversation(...args) }));
vi.mock("@/lib/server/cursor", () => ({ getCursorConversation: (...args: unknown[]) => cursorConversation(...args) }));
vi.mock("@/lib/server/windsurf", () => ({ getWindsurfTrajectory: (...args: unknown[]) => windsurfTrajectory(...args) }));
vi.mock("@/lib/server/metaCache", () => ({ getTrajectoryMetaMapCached: (...args: unknown[]) => metaMap(...args) }));

import { loadSessionRecord, SessionSourceCopyUnsupportedError } from "@/lib/server/sessionRecordLoader";

const config = {
  schemaVersion: 1,
  roots: [],
  windsurf: {},
  ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
} as const;

const summary = {
  totalSteps: 1,
  renderedEvents: 1,
  userCount: 1,
  assistantCount: 0,
  thoughtCount: 0,
  toolCount: 0,
  commandCount: 0,
  subagentCount: 0,
  errorCount: 0
};

const event = (source: "codex" | "antigravity" | "windsurf" | "cursor") => ({
  id: `${source}-event`, index: 0, source, kind: "user" as const, stepType: "user_message", title: "User", text: "Do the work"
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("loadSessionRecord", () => {
  it("loads Codex, preserves root identity, and returns a source copy without writing a backup", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loader-codex-"));
    const filePath = path.join(dir, "rollout-1.jsonl");
    await fs.writeFile(filePath, '{"type":"message"}\n');
    codexConversation.mockResolvedValue({ events: [event("codex")], summary, rootId: "root-actual" });
    codexRaw.mockResolvedValue({ filePath, rawLines: [], truncated: false, returnedLines: 0, totalLines: 0 });
    metaMap.mockResolvedValue({ "session-1": { title: "Codex work", cwd: "/repo", gitBranch: "feature/x" } });

    const result = await loadSessionRecord({ config: config as never, source: "codex", sessionId: "session-1", rootId: " root-requested ", includeSourceCopy: true });
    expect(codexConversation).toHaveBeenCalledWith("session-1", config, { preferredRootId: "root-requested" });
    expect(codexRaw).toHaveBeenCalledWith("session-1", config, { preferredRootId: "root-requested" });
    expect(result.record.sourceRef).toEqual({ kind: "file", locator: filePath });
    expect(result.record.session.rootId).toBe("root-actual");
    expect(result.sourceCopies?.[0]).toMatchObject({ sessionId: "session-1", relativePath: "rollout-1.jsonl" });
    expect(result.sourceCopies?.[0]?.content.toString()).toContain("message");
  });

  it("loads Antigravity runtime records with a stable source locator", async () => {
    antigravityConversation.mockResolvedValue({ markdown: "# Work", events: [event("antigravity")], summary });
    metaMap.mockResolvedValue({});
    const result = await loadSessionRecord({ config: config as never, source: "antigravity", sessionId: "cascade-1" });
    expect(result.record.sourceRef).toEqual({ kind: "runtime_rpc", locator: "antigravity:cascade/cascade-1" });
    expect(result.record.events).toHaveLength(1);
  });

  it("loads all Windsurf trajectory pages deterministically", async () => {
    windsurfTrajectory
      .mockResolvedValueOnce({ events: [event("windsurf")], summary, nextStepOffset: 1, numTotalSteps: 2 })
      .mockResolvedValueOnce({ events: [event("windsurf")], summary, nextStepOffset: 2, numTotalSteps: 2 });
    metaMap.mockResolvedValue({ "cascade-1": { title: "Cascade" } });
    const result = await loadSessionRecord({ config: config as never, source: "windsurf", sessionId: "cascade-1" });
    expect(windsurfTrajectory).toHaveBeenNthCalledWith(1, { config, cascadeId: "cascade-1", stepOffset: 0 });
    expect(windsurfTrajectory).toHaveBeenNthCalledWith(2, { config, cascadeId: "cascade-1", stepOffset: 1 });
    expect(result.record.sourceRef).toEqual({ kind: "runtime_rpc", locator: "windsurf:cascade/cascade-1" });
    expect(result.record.events).toHaveLength(2);
  });

  it("loads Cursor metadata-backed records and carries workspace path", async () => {
    cursorConversation.mockResolvedValue({ locator: "/tmp/state.vscdb#composerData:session-1", workspacePath: "/repo", events: [event("cursor")], summary, markdown: "# Cursor" });
    metaMap.mockResolvedValue({});
    const result = await loadSessionRecord({ config: config as never, source: "cursor", sessionId: "session-1" });
    expect(result.record.sourceRef).toEqual({ kind: "sqlite", locator: "/tmp/state.vscdb#composerData:session-1" });
    expect(result.record.session.cwd).toBe("/repo");
  });

  it.each(["antigravity", "windsurf", "cursor"] as const)("rejects unsupported source copy for %s", async (source) => {
    await expect(loadSessionRecord({ config: config as never, source, sessionId: "session-1", includeSourceCopy: true })).rejects.toBeInstanceOf(SessionSourceCopyUnsupportedError);
  });

  it("normalizes an empty or stale root id through the existing Codex resolver contract", async () => {
    codexConversation.mockRejectedValue(new Error("Codex session not found: session-1"));
    codexRaw.mockResolvedValue({ filePath: "/tmp/missing", rawLines: [], truncated: false, returnedLines: 0, totalLines: 0 });
    metaMap.mockResolvedValue({});
    await expect(loadSessionRecord({ config: config as never, source: "codex", sessionId: "session-1", rootId: "   " })).rejects.toThrow("Codex session not found");
    expect(codexConversation).toHaveBeenCalledWith("session-1", config, { preferredRootId: undefined });
  });

  it("rejects a stale configured root before touching a provider", async () => {
    const configured = { ...config, roots: [{ id: "root-current", source: "codex", path: "/repo", enabled: true }] };
    await expect(loadSessionRecord({ config: configured as never, source: "codex", sessionId: "session-1", rootId: "root-stale" })).rejects.toThrow("Configured codex root not found");
    expect(codexConversation).not.toHaveBeenCalled();
  });
});
