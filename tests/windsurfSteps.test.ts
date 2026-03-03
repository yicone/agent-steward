import { describe, expect, it } from "vitest";

import { normalizeWindsurfStepsToMessages, normalizeWindsurfStepsToTrajectoryEvents } from "../src/lib/parse/windsurfSteps";

describe("normalizeWindsurfStepsToMessages", () => {
  it("maps userInput + plannerResponse", () => {
    const steps = [
      { userInput: { query: "hello" }, type: "USER_INPUT" },
      { plannerResponse: { response: "hi" }, type: "PLANNER_RESPONSE" }
    ];
    const msgs = normalizeWindsurfStepsToMessages(steps);
    expect(msgs[0]).toEqual({ role: "user", text: "hello" });
    expect(msgs[1]).toEqual({ role: "assistant", text: "hi" });
  });

  it("supports snake_case fields from Connect JSON", () => {
    const steps = [
      { user_input: { user_response: "first" }, type: "CORTEX_STEP_TYPE_USER_INPUT" },
      { planner_response: { thinking: "t", modified_response: "answer" }, type: "CORTEX_STEP_TYPE_PLANNER_RESPONSE" }
    ];
    const msgs = normalizeWindsurfStepsToMessages(steps);
    expect(msgs[0]).toEqual({ role: "user", text: "first" });
    expect(msgs[1]).toEqual({ role: "assistant", text: "t" });
    expect(msgs[2]).toEqual({ role: "assistant", text: "answer" });
  });

  it("skips cleared steps (metadata only)", () => {
    const steps = [
      { type: "CORTEX_STEP_TYPE_USER_INPUT", status: "CORTEX_STEP_STATUS_CLEARED", userInput: { userResponse: "hidden" } },
      { type: "CORTEX_STEP_TYPE_USER_INPUT", status: "CORTEX_STEP_STATUS_DONE", userInput: { userResponse: "visible" } }
    ];
    const msgs = normalizeWindsurfStepsToMessages(steps);
    expect(msgs).toEqual([{ role: "user", text: "visible" }]);
  });

  it("can include cleared steps when requested", () => {
    const steps = [
      { type: "CORTEX_STEP_TYPE_USER_INPUT", status: "CORTEX_STEP_STATUS_CLEARED", metadata: { executionId: "e" } },
      { type: "CORTEX_STEP_TYPE_USER_INPUT", status: "CORTEX_STEP_STATUS_DONE", userInput: { userResponse: "visible" } }
    ];
    const msgs = normalizeWindsurfStepsToMessages(steps, { includeCleared: true });
    expect(msgs[0]?.role).toBe("tool");
    expect(msgs[1]).toEqual({ role: "user", text: "visible" });
  });

  it("maps steps to unified trajectory events", () => {
    const steps = [
      {
        type: "CORTEX_STEP_TYPE_USER_INPUT",
        metadata: { executionId: "exec-1" },
        userInput: { query: "hello" }
      },
      {
        type: "CORTEX_STEP_TYPE_PLANNER_RESPONSE",
        metadata: { executionId: "exec-1" },
        plannerResponse: {
          thinking: "thinking",
          response: "done"
        }
      }
    ];
    const out = normalizeWindsurfStepsToTrajectoryEvents(steps);
    expect(out.events[0]?.source).toBe("windsurf");
    expect(out.events[0]?.executionId).toBe("exec-1");
    expect(out.summary.userCount).toBe(1);
    expect(out.summary.assistantCount).toBe(1);
    expect(out.summary.thoughtCount).toBe(1);
  });
});
