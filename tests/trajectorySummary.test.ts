import { describe, expect, it } from "vitest";

import { isErrorLikeTrajectoryEvent, summarizeTrajectoryEvents } from "../src/lib/parse/trajectory";
import type { TrajectoryEvent } from "../src/lib/types";

function event(overrides: Partial<TrajectoryEvent>): TrajectoryEvent {
  return {
    id: "e-1",
    index: 1,
    source: "antigravity",
    kind: "status",
    stepType: "status",
    title: "Status",
    ...overrides
  };
}

describe("isErrorLikeTrajectoryEvent", () => {
  it("detects title/status/exitCode based errors", () => {
    expect(isErrorLikeTrajectoryEvent(event({ title: "Error" }))).toBe(true);
    expect(isErrorLikeTrajectoryEvent(event({ status: "COMMAND_ERROR" }))).toBe(true);
    expect(isErrorLikeTrajectoryEvent(event({ exitCode: 2 }))).toBe(true);
    expect(isErrorLikeTrajectoryEvent(event({ title: "OK", status: "RUNNING", exitCode: 0 }))).toBe(false);
  });
});

describe("summarizeTrajectoryEvents", () => {
  it("counts error-like events exactly once", () => {
    const events: TrajectoryEvent[] = [
      event({ id: "a", title: "Error", status: "COMMAND_ERROR", exitCode: 1 }),
      event({ id: "b", status: "COMMAND_ERROR" }),
      event({ id: "c", title: "Done", status: "RUNNING", exitCode: 0 })
    ];

    const summary = summarizeTrajectoryEvents(events, 3);
    expect(summary.errorCount).toBe(2);
  });
});
