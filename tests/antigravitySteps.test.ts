import { describe, expect, it } from "vitest";

import { normalizeAntigravityTrajectoryToEvents } from "../src/lib/parse/antigravitySteps";

describe("normalizeAntigravityTrajectoryToEvents", () => {
  it("maps user, thinking, assistant, tool calls and command output", () => {
    const trajectory = {
      steps: [
        {
          type: "CORTEX_STEP_TYPE_USER_INPUT",
          status: "CORTEX_STEP_STATUS_DONE",
          metadata: { createdAt: "2026-02-01T00:00:00Z" },
          userInput: { userResponse: "Please review this code." }
        },
        {
          type: "CORTEX_STEP_TYPE_PLANNER_RESPONSE",
          status: "CORTEX_STEP_STATUS_DONE",
          metadata: { createdAt: "2026-02-01T00:00:01Z" },
          plannerResponse: {
            thinking: "I will inspect the route and then run tests.",
            modifiedResponse: "Found two issues and prepared fixes.",
            toolCalls: [{ id: "tc-1", name: "view_file", argumentsJson: "{\"path\":\"src/app.ts\"}" }]
          }
        },
        {
          type: "CORTEX_STEP_TYPE_RUN_COMMAND",
          status: "CORTEX_STEP_STATUS_DONE",
          runCommand: {
            commandLine: "pnpm test",
            cwd: "/Users/tr/Workspace/agent-storage-manager",
            exitCode: 1,
            combinedOutput: { full: "failed tests" }
          }
        },
        {
          type: "CORTEX_STEP_TYPE_COMMAND_STATUS",
          status: "CORTEX_STEP_STATUS_RUNNING",
          commandStatus: { commandId: "cmd-1", status: "CORTEX_STEP_STATUS_RUNNING" }
        }
      ]
    };

    const out = normalizeAntigravityTrajectoryToEvents({ trajectory });
    expect(out.summary.totalSteps).toBe(4);
    expect(out.summary.userCount).toBe(1);
    expect(out.summary.thoughtCount).toBe(1);
    expect(out.summary.assistantCount).toBe(1);
    expect(out.summary.commandCount).toBe(1);
    expect(out.summary.errorCount).toBe(1);

    const kinds = out.events.map((x) => x.kind);
    expect(kinds).toContain("user");
    expect(kinds).toContain("thought");
    expect(kinds).toContain("assistant");
    expect(kinds).toContain("tool");
    expect(kinds).toContain("command");
    expect(kinds).toContain("status");
    expect(out.events.find((x) => x.kind === "command")?.output).toContain("failed tests");
  });

  it("deduplicates repeated command status events", () => {
    const trajectory = {
      steps: [
        {
          type: "CORTEX_STEP_TYPE_COMMAND_STATUS",
          status: "CORTEX_STEP_STATUS_RUNNING",
          commandStatus: { commandId: "cmd-1", status: "CORTEX_STEP_STATUS_RUNNING" }
        },
        {
          type: "CORTEX_STEP_TYPE_COMMAND_STATUS",
          status: "CORTEX_STEP_STATUS_RUNNING",
          commandStatus: { commandId: "cmd-1", status: "CORTEX_STEP_STATUS_RUNNING" }
        }
      ]
    };

    const out = normalizeAntigravityTrajectoryToEvents({ trajectory });
    expect(out.events).toHaveLength(1);
    expect(out.events[0]?.kind).toBe("status");
  });
});

