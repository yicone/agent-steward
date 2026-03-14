import { describe, expect, it } from "vitest";

import {
  extractCodexSessionMeta,
  extractCodexTitle,
  normalizeCodexEventsToTrajectoryEvents,
  parseCodexJsonl,
  parseCodexJsonlLine
} from "../src/lib/parse/codexLog";

/* ---------- parseCodexJsonlLine ---------- */

describe("parseCodexJsonlLine", () => {
  it("parses a valid JSON line", () => {
    const result = parseCodexJsonlLine('{"type":"user_message","item":{"content":"Hello"},"seq":1}');
    expect(result).not.toBeNull();
    expect(result?.type).toBe("user_message");
    expect(result?.seq).toBe(1);
  });

  it("returns null for blank lines", () => {
    expect(parseCodexJsonlLine("")).toBeNull();
    expect(parseCodexJsonlLine("   ")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseCodexJsonlLine("{invalid json}")).toBeNull();
  });

  it("returns null when type is missing", () => {
    expect(parseCodexJsonlLine('{"item":{}}')).toBeNull();
  });

  it("trims leading/trailing whitespace", () => {
    const result = parseCodexJsonlLine('  {"type":"session_meta","item":{}}  ');
    expect(result?.type).toBe("session_meta");
  });
});

/* ---------- parseCodexJsonl ---------- */

describe("parseCodexJsonl", () => {
  it("parses multiple lines", () => {
    const content = [
      '{"type":"session_meta","item":{"cwd":"/workspace","model":"gpt-4"},"seq":1}',
      '{"type":"user_message","item":{"content":"Hello"},"seq":2}',
      "",
      '{"type":"assistant_message","item":{"content":"Hi there!"},"seq":3}'
    ].join("\n");
    const result = parseCodexJsonl(content);
    expect(result).toHaveLength(3);
    expect(result[0]?.type).toBe("session_meta");
    expect(result[1]?.type).toBe("user_message");
    expect(result[2]?.type).toBe("assistant_message");
  });

  it("ignores blank lines and parse failures", () => {
    const content = "\n\n{bad}\n\n";
    expect(parseCodexJsonl(content)).toHaveLength(0);
  });
});

/* ---------- extractCodexSessionMeta ---------- */

describe("extractCodexSessionMeta", () => {
  it("extracts cwd and model from session_meta", () => {
    const events = parseCodexJsonl(
      '{"type":"session_meta","item":{"session_id":"abc123","cwd":"/home/user/project","model":"gpt-4o","timestamp":"2025-03-14T12:00:00Z"}}'
    );
    const meta = extractCodexSessionMeta(events);
    expect(meta.sessionId).toBe("abc123");
    expect(meta.cwd).toBe("/home/user/project");
    expect(meta.model).toBe("gpt-4o");
    expect(meta.timestamp).toBe("2025-03-14T12:00:00Z");
  });

  it("returns empty object when no session_meta event", () => {
    const events = parseCodexJsonl('{"type":"user_message","item":{"content":"Hi"}}');
    expect(extractCodexSessionMeta(events)).toEqual({});
  });
});

/* ---------- extractCodexTitle ---------- */

describe("extractCodexTitle", () => {
  it("returns first line of first user message", () => {
    const events = parseCodexJsonl(
      '{"type":"user_message","item":{"content":"Create a calculator app\\nwith add/subtract operations"}}'
    );
    expect(extractCodexTitle(events)).toBe("Create a calculator app");
  });

  it("truncates long titles to 120 chars", () => {
    const longText = "a".repeat(200);
    const line = JSON.stringify({ type: "user_message", item: { content: longText } });
    const events = parseCodexJsonl(line);
    const title = extractCodexTitle(events);
    expect(title).toBeDefined();
    expect(title!.length).toBeLessThanOrEqual(122); // 120 + ellipsis char
  });

  it("returns undefined when no user message", () => {
    const events = parseCodexJsonl('{"type":"session_meta","item":{}}');
    expect(extractCodexTitle(events)).toBeUndefined();
  });
});

/* ---------- normalizeCodexEventsToTrajectoryEvents ---------- */

describe("normalizeCodexEventsToTrajectoryEvents", () => {
  const sampleJsonl = [
    '{"type":"session_meta","item":{"session_id":"s1","cwd":"/workspace","model":"gpt-4o"},"seq":0}',
    '{"type":"user_message","item":{"content":"Write a hello world script","timestamp":"2025-03-14T12:00:00Z"},"seq":1}',
    '{"type":"assistant_message","item":{"content":"I\'ll create that for you.","timestamp":"2025-03-14T12:00:01Z"},"seq":2}',
    '{"type":"tool_call","item":{"call_id":"c1","tool_name":"write_file","arguments":{"path":"hello.py","content":"print(\\"Hello, world!\\")"},"timestamp":"2025-03-14T12:00:02Z"},"seq":3}',
    '{"type":"tool_result","item":{"call_id":"c1","tool_name":"write_file","result":"File written","exit_code":0,"timestamp":"2025-03-14T12:00:02Z"},"seq":4}'
  ].join("\n");

  it("produces the correct number of events", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    expect(events).toHaveLength(5);
  });

  it("session_meta emits a status event", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    const meta = events[0];
    expect(meta?.kind).toBe("status");
    expect(meta?.stepType).toBe("session_meta");
    expect(meta?.cwd).toBe("/workspace");
  });

  it("user_message emits a user event", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    const user = events[1];
    expect(user?.kind).toBe("user");
    expect(user?.text).toBe("Write a hello world script");
    expect(user?.source).toBe("codex");
  });

  it("assistant_message emits an assistant event", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    const assistant = events[2];
    expect(assistant?.kind).toBe("assistant");
    expect(assistant?.text).toContain("create that for you");
  });

  it("tool_call emits a tool event with toolCalls", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    const toolCall = events[3];
    expect(toolCall?.kind).toBe("tool");
    expect(toolCall?.stepType).toBe("tool_call");
    expect(toolCall?.title).toBe("write_file");
    expect(toolCall?.toolCalls).toHaveLength(1);
    expect(toolCall?.toolCalls?.[0]?.name).toBe("write_file");
    expect(toolCall?.toolCalls?.[0]?.id).toBe("c1");
  });

  it("tool_result emits a tool event with exitCode", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    const result = events[4];
    expect(result?.kind).toBe("tool");
    expect(result?.stepType).toBe("tool_result");
    expect(result?.exitCode).toBe(0);
    expect(result?.text).toBe("File written");
  });

  it("summary counts are correct", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { summary } = normalizeCodexEventsToTrajectoryEvents(raw);
    expect(summary.userCount).toBe(1);
    expect(summary.assistantCount).toBe(1);
    expect(summary.toolCount).toBe(2); // tool_call + tool_result
  });

  it("error event gets error status", () => {
    const raw = parseCodexJsonl('{"type":"error","item":{"message":"Something went wrong"}}');
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    expect(events[0]?.kind).toBe("other");
    expect(events[0]?.status).toBe("ERROR");
    expect(events[0]?.text).toBe("Something went wrong");
  });

  it("unknown event types are emitted as other", () => {
    const raw = parseCodexJsonl('{"type":"custom_event","item":{"content":"custom payload"}}');
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    expect(events[0]?.kind).toBe("other");
    expect(events[0]?.stepType).toBe("custom_event");
  });

  it("reasoning emits a thought event", () => {
    const raw = parseCodexJsonl('{"type":"reasoning","item":{"content":"Let me think..."}}');
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    expect(events[0]?.kind).toBe("thought");
    expect(events[0]?.text).toBe("Let me think...");
  });

  it("command event emits a command kind", () => {
    const raw = parseCodexJsonl(
      '{"type":"exec","item":{"command":"ls -la","cwd":"/workspace","exit_code":0,"output":"total 8"}}'
    );
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    expect(events[0]?.kind).toBe("command");
    expect(events[0]?.commandLine).toBe("ls -la");
    expect(events[0]?.exitCode).toBe(0);
    expect(events[0]?.output).toBe("total 8");
  });

  it("assigns sequential index values", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    for (let i = 0; i < events.length; i++) {
      expect(events[i]?.index).toBe(i);
    }
  });

  it("all events have source=codex", () => {
    const raw = parseCodexJsonl(sampleJsonl);
    const { events } = normalizeCodexEventsToTrajectoryEvents(raw);
    for (const event of events) {
      expect(event.source).toBe("codex");
    }
  });
});
