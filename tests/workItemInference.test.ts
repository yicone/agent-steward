import { describe, expect, it } from "vitest";

import { inferWorkItem } from "@/lib/workItemInference";
import type { SessionRecord } from "@/lib/sessionRecord";

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    schemaVersion: "session-record/v1",
    session: { id: "session-1", source: "codex", title: "Fix login timeout", cwd: "/repo", gitBranch: "feature/login" },
    sourceRef: { kind: "file", locator: "/home/user/.codex/rollout.jsonl" },
    provenance: { capturedBy: "agent-steward", capturedAt: "2026-09-19T10:00:00.000Z" },
    timestamps: { capturedAt: "2026-09-19T10:00:00.000Z" },
    summary: { totalSteps: 5, renderedEvents: 5, userCount: 2, assistantCount: 1, thoughtCount: 0, toolCount: 1, commandCount: 1, subagentCount: 0, errorCount: 1 },
    events: [
      { id: "u1", index: 0, source: "codex", kind: "user", stepType: "user_message", title: "User", text: "Fix the login timeout in src/auth/login.ts", createdAt: "2026-09-19T09:00:00.000Z" },
      { id: "c1", index: 1, source: "codex", kind: "command", stepType: "command", title: "Command", commandLine: "pnpm test src/auth/login.test.ts", cwd: "/repo", createdAt: "2026-09-19T09:01:00.000Z", completedAt: "2026-09-19T09:01:05.000Z", exitCode: 1, output: "Error: timeout" },
      { id: "a1", index: 2, source: "codex", kind: "assistant", stepType: "assistant_message", title: "Assistant", text: "I fixed the timeout handling. Next, please run the focused test.", createdAt: "2026-09-19T09:02:00.000Z" },
      { id: "u2", index: 3, source: "codex", kind: "user", stepType: "user_message", title: "User", text: "Next, verify the login test", createdAt: "2026-09-19T09:03:00.000Z" },
      { id: "e1", index: 4, source: "codex", kind: "status", stepType: "error", title: "Error", text: "Test failed", createdAt: "2026-09-19T09:04:00.000Z" }
    ],
    ...overrides
  };
}

describe("inferWorkItem", () => {
  it("extracts bounded goal, progress, errors, files, commands, and repository state with attribution", () => {
    const result = inferWorkItem({
      record: record(),
      project: { rootPath: "/repo", worktreePath: "/repo", branch: "feature/login", commit: "abc123", dirty: true, untrackedFiles: ["tmp.log"] }
    });
    expect(result.goal.value).toContain("Fix the login timeout");
    expect(result.goal.confidence).toBe("inferred");
    expect(result.goal.attribution).toBe("explicitly referenced");
    expect(result.progress.some((item) => item.kind === "completed")).toBe(true);
    expect(result.progress.every((item) => item.confidence && item.attribution)).toBe(true);
    expect(result.errors.length).toBe(2);
    expect(result.errors[0]).toMatchObject({ kind: "error", confidence: "observed", attribution: "observed available" });
    expect(result.commandReferences[0]?.locator).toContain("pnpm test");
    expect(result.fileReferences.some((item) => item.locator.includes("src/auth/login.ts"))).toBe(true);
    expect(result.repositoryState).toMatchObject({ rootPath: "/repo", branch: "feature/login", commit: "abc123", dirty: true, untracked: ["tmp.log"], confidence: "observed" });
  });

  it("attributes repo-local provider evidence and keeps global runtime influence unknown", () => {
    const result = inferWorkItem({
      record: record(),
      project: {
        rootPath: "/repo",
        evidenceProvider: {
          provider: "project-evidence-provider-v1",
          status: "available",
          projectName: "repo",
          rootLabel: "/repo",
          evidenceSource: "repo-local",
          items: [{ id: "rule-1", path: ".codex/rules.md", title: "Rules", kind: "rule", source: "codex", evidenceSource: "repo-local", status: "read" }],
          assets: [],
          diagnostics: []
        }
      }
    });
    expect(result.context).toContainEqual(expect.objectContaining({ id: "rule-1", source: "codex", scope: "project", attribution: "observed available", confidence: "observed", locator: ".codex/rules.md" }));
    expect(result.context).toContainEqual(expect.objectContaining({ scope: "global", attribution: "unknown influence", confidence: "unknown" }));
  });

  it("marks missing values explicitly when the source has no usable goal or repository metadata", () => {
    const empty = record({ session: { id: "empty", source: "cursor" }, events: [] });
    const result = inferWorkItem({ record: empty });
    expect(result.goal.confidence).toBe("missing");
    expect(result.repositoryState.confidence).toBe("unknown");
    expect(result.context.at(-1)).toMatchObject({ attribution: "unknown influence", confidence: "unknown" });
    expect(result.warnings[0]).toContain("confirmation");
  });
});
