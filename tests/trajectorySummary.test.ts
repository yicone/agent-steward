import { describe, expect, it } from "vitest";

import {
  isErrorLikeTrajectoryEvent,
  matchesConversationSearch,
  matchesEventSearch,
  summarizeTrajectoryEvents
} from "../src/lib/parse/trajectory";
import type { ConversationListItem, TrajectoryEvent } from "../src/lib/types";

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

function listItem(overrides: Partial<ConversationListItem>): ConversationListItem {
  return {
    id: "conv-123",
    source: "antigravity",
    rootId: "root-1",
    path: "/path/to/conv",
    sizeBytes: 1024,
    mtimeMs: Date.now(),
    ...overrides
  };
}

describe("matchesEventSearch", () => {
  it("returns true for empty query", () => {
    expect(matchesEventSearch(event({ title: "anything" }), "")).toBe(true);
    expect(matchesEventSearch(event({ title: "anything" }), "   ")).toBe(true);
  });

  it("matches on title (case-insensitive)", () => {
    expect(matchesEventSearch(event({ title: "Run shell command" }), "shell")).toBe(true);
    expect(matchesEventSearch(event({ title: "Run shell command" }), "SHELL")).toBe(true);
    expect(matchesEventSearch(event({ title: "Run shell command" }), "python")).toBe(false);
  });

  it("matches on text", () => {
    expect(matchesEventSearch(event({ text: "Hello from assistant" }), "hello")).toBe(true);
    expect(matchesEventSearch(event({ text: "Hello from assistant" }), "goodbye")).toBe(false);
  });

  it("matches on output", () => {
    expect(matchesEventSearch(event({ output: "npm test passed" }), "passed")).toBe(true);
    expect(matchesEventSearch(event({ output: "npm test passed" }), "failed")).toBe(false);
  });

  it("matches on stepType", () => {
    expect(matchesEventSearch(event({ stepType: "runCommand" }), "runcommand")).toBe(true);
    expect(matchesEventSearch(event({ stepType: "runCommand" }), "edit_file")).toBe(false);
  });

  it("matches on commandLine", () => {
    expect(matchesEventSearch(event({ commandLine: "git status" }), "git")).toBe(true);
    expect(matchesEventSearch(event({ commandLine: "git status" }), "npm")).toBe(false);
  });

  it("matches on tool call name", () => {
    expect(
      matchesEventSearch(event({ toolCalls: [{ name: "read_file", argumentsJson: "{}" }] }), "read_file")
    ).toBe(true);
    expect(
      matchesEventSearch(event({ toolCalls: [{ name: "read_file", argumentsJson: "{}" }] }), "write_file")
    ).toBe(false);
  });
});

describe("matchesConversationSearch", () => {
  it("returns true for empty query", () => {
    expect(matchesConversationSearch(listItem({}), "")).toBe(true);
    expect(matchesConversationSearch(listItem({}), "  ")).toBe(true);
  });

  it("matches on id (case-insensitive)", () => {
    expect(matchesConversationSearch(listItem({ id: "abc-123" }), "abc")).toBe(true);
    expect(matchesConversationSearch(listItem({ id: "abc-123" }), "ABC")).toBe(true);
    expect(matchesConversationSearch(listItem({ id: "abc-123" }), "xyz")).toBe(false);
  });

  it("matches on title", () => {
    expect(matchesConversationSearch(listItem({ title: "Fix the login bug" }), "login")).toBe(true);
    expect(matchesConversationSearch(listItem({ title: "Fix the login bug" }), "logout")).toBe(false);
  });

  it("matches on cwd", () => {
    expect(matchesConversationSearch(listItem({ cwd: "/home/user/project" }), "project")).toBe(true);
    expect(matchesConversationSearch(listItem({ cwd: "/home/user/project" }), "other")).toBe(false);
  });

  it("does not match on missing optional fields", () => {
    expect(matchesConversationSearch(listItem({ title: undefined, cwd: undefined }), "something")).toBe(false);
  });

  it("matches when only one optional field is defined", () => {
    expect(matchesConversationSearch(listItem({ title: "Fix login", cwd: undefined }), "login")).toBe(true);
    expect(matchesConversationSearch(listItem({ title: undefined, cwd: "/home/user/project" }), "project")).toBe(true);
  });
});
