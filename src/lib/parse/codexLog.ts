import type { TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { summarizeTrajectoryEvents } from "@/lib/parse/trajectory";

/* ---------- Codex JSONL event types ---------- */

/**
 * Raw shape of a single line in a Codex session rollout `.jsonl` file.
 * Each line is a JSON object with a `type` discriminator and an `item` payload.
 */
export type CodexRawEvent = {
  type: string;
  item?: Record<string, unknown>;
  seq?: number;
};

/** Parsed session-level metadata extracted from a `session_meta` event. */
export type CodexSessionMeta = {
  sessionId?: string;
  cwd?: string;
  model?: string;
  timestamp?: string;
};

/* ---------- helpers ---------- */

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getField(obj: unknown, ...keys: string[]): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const o = obj as Record<string, unknown>;
  for (const key of keys) {
    if (key in o) return o[key];
  }
  return undefined;
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated]`;
}

function formatToolArgs(args: unknown): string | undefined {
  if (!args) return undefined;
  let text: string;
  if (typeof args === "string") {
    text = args;
  } else {
    try {
      text = JSON.stringify(args, null, 2);
    } catch {
      text = String(args);
    }
  }
  return truncate(text, 4000);
}

/** Max chars for tool/function result text (matches Antigravity adapter). */
const MAX_TOOL_OUTPUT_CHARS = 16_000;
/** Max chars for command/exec output (matches Antigravity adapter). */
const MAX_COMMAND_OUTPUT_CHARS = 10_000;

/* ---------- line parsing ---------- */

/**
 * Parse a single JSONL line into a CodexRawEvent.
 * Returns null for blank lines or parse failures.
 */
export function parseCodexJsonlLine(line: string): CodexRawEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || typeof (parsed as any).type !== "string") return null;
    return parsed as CodexRawEvent;
  } catch {
    return null;
  }
}

/**
 * Parse all lines from a Codex JSONL file content into raw events.
 */
export function parseCodexJsonl(content: string): CodexRawEvent[] {
  return content
    .split("\n")
    .map((line) => parseCodexJsonlLine(line))
    .filter((e): e is CodexRawEvent => e !== null);
}

/* ---------- metadata extraction ---------- */

/**
 * Extract session-level metadata from the first `session_meta` event.
 */
export function extractCodexSessionMeta(events: CodexRawEvent[]): CodexSessionMeta {
  const metaEvent = events.find((e) => e.type === "session_meta");
  if (!metaEvent?.item) return {};
  const item = metaEvent.item;
  return {
    sessionId: asNonEmptyString(item.session_id) ?? undefined,
    cwd: asNonEmptyString(item.cwd) ?? undefined,
    model: asNonEmptyString(item.model) ?? undefined,
    timestamp: asNonEmptyString(item.timestamp) ?? undefined
  };
}

/**
 * Extract a short title from the first user message in the session.
 */
export function extractCodexTitle(events: CodexRawEvent[]): string | undefined {
  const userEvent = events.find((e) => e.type === "user_message");
  if (!userEvent?.item) return undefined;
  const content = asNonEmptyString(getField(userEvent.item, "content") as unknown) ?? undefined;
  if (!content) return undefined;
  // Use first line, truncated to 120 chars
  const firstLine = content.split("\n")[0] ?? content;
  return firstLine.length > 120 ? `${firstLine.slice(0, 120)}…` : firstLine;
}

/* ---------- normalization ---------- */

/**
 * Normalize raw Codex JSONL events into the unified TrajectoryEvent model.
 */
export function normalizeCodexEventsToTrajectoryEvents(rawEvents: CodexRawEvent[]): {
  events: TrajectoryEvent[];
  summary: TrajectorySummary;
} {
  const events: TrajectoryEvent[] = [];
  let index = 0;

  for (const raw of rawEvents) {
    const item = raw.item ?? {};
    const timestamp = asNonEmptyString(getField(item, "timestamp") as unknown) ?? undefined;

    switch (raw.type) {
      case "session_meta": {
        // Session metadata — emit as a status event
        const model = asNonEmptyString(getField(item, "model") as unknown);
        const cwd = asNonEmptyString(getField(item, "cwd") as unknown);
        const sessionId = asNonEmptyString(getField(item, "session_id") as unknown);
        const label = [model && `model: ${model}`, sessionId && `id: ${sessionId}`].filter(Boolean).join(", ");
        events.push({
          id: `session_meta_${index}`,
          index,
          source: "codex",
          kind: "status",
          stepType: "session_meta",
          title: "Session started",
          text: label || undefined,
          cwd: cwd ?? undefined,
          createdAt: timestamp
        });
        break;
      }

      case "user_message": {
        const content = asNonEmptyString(getField(item, "content") as unknown) ?? "";
        events.push({
          id: `user_${index}`,
          index,
          source: "codex",
          kind: "user",
          stepType: "user_message",
          title: "User",
          text: content,
          createdAt: timestamp
        });
        break;
      }

      case "assistant_message": {
        const content = asNonEmptyString(getField(item, "content") as unknown) ?? "";
        events.push({
          id: `assistant_${index}`,
          index,
          source: "codex",
          kind: "assistant",
          stepType: "assistant_message",
          title: "Assistant",
          text: content,
          createdAt: timestamp
        });
        break;
      }

      case "reasoning": {
        // Internal reasoning / thinking step
        const content = asNonEmptyString(getField(item, "content") as unknown) ?? "";
        events.push({
          id: `reasoning_${index}`,
          index,
          source: "codex",
          kind: "thought",
          stepType: "reasoning",
          title: "Reasoning",
          text: content,
          createdAt: timestamp
        });
        break;
      }

      case "tool_call": {
        const toolName = asNonEmptyString(getField(item, "tool_name", "name") as unknown) ?? "tool";
        const callId = asNonEmptyString(getField(item, "call_id", "id") as unknown) ?? undefined;
        const args = getField(item, "arguments", "args");
        events.push({
          id: `tool_call_${index}`,
          index,
          source: "codex",
          kind: "tool",
          stepType: "tool_call",
          title: toolName,
          toolCalls: [
            {
              id: callId,
              name: toolName,
              argumentsJson: formatToolArgs(args)
            }
          ],
          createdAt: timestamp
        });
        break;
      }

      case "tool_result": {
        const toolName = asNonEmptyString(getField(item, "tool_name", "name") as unknown) ?? "tool";
        const exitCode =
          typeof item.exit_code === "number" ? item.exit_code : typeof item.exitCode === "number" ? item.exitCode : undefined;
        const rawResultText = asNonEmptyString(getField(item, "result", "output") as unknown) ?? undefined;
        const resultText = rawResultText ? truncate(rawResultText, MAX_TOOL_OUTPUT_CHARS) : undefined;
        events.push({
          id: `tool_result_${index}`,
          index,
          source: "codex",
          kind: "tool",
          stepType: "tool_result",
          title: `${toolName} result`,
          text: resultText,
          exitCode,
          createdAt: timestamp
        });
        break;
      }

      case "function_call": {
        // Older / alternative naming for tool_call
        const name = asNonEmptyString(getField(item, "name", "function", "tool_name") as unknown) ?? "function";
        const callId = asNonEmptyString(getField(item, "call_id", "id") as unknown) ?? undefined;
        const args = getField(item, "arguments", "args");
        events.push({
          id: `fn_call_${index}`,
          index,
          source: "codex",
          kind: "tool",
          stepType: "function_call",
          title: name,
          toolCalls: [{ id: callId, name, argumentsJson: formatToolArgs(args) }],
          createdAt: timestamp
        });
        break;
      }

      case "function_result":
      case "function_call_output": {
        const name = asNonEmptyString(getField(item, "name", "function", "tool_name") as unknown) ?? "function";
        const exitCode =
          typeof item.exit_code === "number" ? item.exit_code : typeof item.exitCode === "number" ? item.exitCode : undefined;
        const rawResultText = asNonEmptyString(getField(item, "output", "result") as unknown) ?? undefined;
        const resultText = rawResultText ? truncate(rawResultText, MAX_TOOL_OUTPUT_CHARS) : undefined;
        events.push({
          id: `fn_result_${index}`,
          index,
          source: "codex",
          kind: "tool",
          stepType: raw.type,
          title: `${name} result`,
          text: resultText,
          exitCode,
          createdAt: timestamp
        });
        break;
      }

      case "exec":
      case "shell":
      case "command": {
        const cmd = asNonEmptyString(getField(item, "command", "cmd") as unknown) ?? "";
        const cwd = asNonEmptyString(getField(item, "cwd") as unknown) ?? undefined;
        const exitCode =
          typeof item.exit_code === "number" ? item.exit_code : typeof item.exitCode === "number" ? item.exitCode : undefined;
        const rawOutput = asNonEmptyString(getField(item, "output", "stdout", "result") as unknown) ?? undefined;
        const output = rawOutput ? truncate(rawOutput, MAX_COMMAND_OUTPUT_CHARS) : undefined;
        const outputTruncated = rawOutput !== undefined && rawOutput !== output ? true : undefined;
        events.push({
          id: `cmd_${index}`,
          index,
          source: "codex",
          kind: "command",
          stepType: raw.type,
          title: cmd || raw.type,
          commandLine: cmd || undefined,
          cwd,
          exitCode,
          output,
          ...(outputTruncated ? { outputTruncated } : {}),
          createdAt: timestamp
        });
        break;
      }

      case "error":
      case "system_event": {
        const msg = asNonEmptyString(getField(item, "message", "content", "error") as unknown) ?? raw.type;
        events.push({
          id: `${raw.type}_${index}`,
          index,
          source: "codex",
          kind: raw.type === "error" ? "other" : "status",
          stepType: raw.type,
          title: raw.type === "error" ? "Error" : "System",
          text: msg,
          status: raw.type === "error" ? "ERROR" : undefined,
          createdAt: timestamp
        });
        break;
      }

      default: {
        // Emit unknown event types as "other" so nothing is silently dropped
        const text = asNonEmptyString(getField(item, "content", "message", "text") as unknown) ?? undefined;
        events.push({
          id: `other_${raw.type}_${index}`,
          index,
          source: "codex",
          kind: "other",
          stepType: raw.type,
          title: raw.type,
          text,
          createdAt: timestamp
        });
        break;
      }
    }

    index += 1;
  }

  const summary = summarizeTrajectoryEvents(events, rawEvents.length);
  return { events, summary };
}
