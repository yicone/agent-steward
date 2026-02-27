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
