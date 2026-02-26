import { describe, expect, it } from "vitest";

import { normalizeWindsurfStepsToMessages } from "../src/lib/parse/steps";

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
});
