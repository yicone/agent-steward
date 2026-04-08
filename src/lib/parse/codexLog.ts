import type { TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { summarizeTrajectoryEvents } from "@/lib/parse/trajectory";

/* ---------- Codex JSONL event types ---------- */

/**
 * Raw shape of a single line in a Codex session rollout `.jsonl` file.
 * Each line is a JSON object with a `type` discriminator and either an `item`
 * or `payload` body depending on the Codex CLI version / emitter.
 */
export type CodexRawEvent = {
  type: string;
  item?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  seq?: number;
  timestamp?: string;
};

/** Parsed session-level metadata extracted from a `session_meta` record. */
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


function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractMessageText(content: unknown): string | undefined {
  if (typeof content === "string") {
    return asNonEmptyString(content) ?? undefined;
  }
  if (!Array.isArray(content)) return undefined;

  const parts = content
    .map((part) => {
      const record = asRecord(part);
      if (!record) return null;
      return asNonEmptyString(getField(record, "text", "content", "message") as unknown);
    })
    .filter((part): part is string => Boolean(part));

  if (!parts.length) return undefined;
  return parts.join("\n");
}

function extractInlineText(item: Record<string, unknown>): string | undefined {
  return (
    asNonEmptyString(getField(item, "message", "content", "text") as unknown) ??
    extractMessageText(getField(item, "content"))
  );
}

type NormalizedCodexRawEvent = {
  type: string;
  item: Record<string, unknown>;
  timestamp?: string;
};

function normalizeRawCodexEvent(raw: CodexRawEvent): NormalizedCodexRawEvent {
  const item = asRecord(raw.item) ?? asRecord(raw.payload) ?? {};
  const topLevelTimestamp = asNonEmptyString(raw.timestamp) ?? undefined;
  const itemTimestamp = asNonEmptyString(getField(item, "timestamp") as unknown) ?? undefined;

  if (raw.type === "event_msg") {
    const payloadType = asNonEmptyString(getField(item, "type") as unknown);
    if (payloadType === "user_message") {
      const content = extractInlineText(item);
      return {
        type: "user_message",
        item: {
          ...item,
          ...(content ? { content } : {})
        },
        timestamp: itemTimestamp ?? topLevelTimestamp
      };
    }
    if (payloadType === "agent_message" || payloadType === "assistant_message") {
      const message = extractInlineText(item);
      return {
        type: "assistant_message",
        item: {
          ...item,
          ...(message ? { content: message } : {})
        },
        timestamp: itemTimestamp ?? topLevelTimestamp
      };
    }
    if (payloadType === "reasoning" || payloadType === "agent_reasoning") {
      const content = extractInlineText(item);
      return {
        type: "reasoning",
        item: {
          ...item,
          ...(content ? { content } : {})
        },
        timestamp: itemTimestamp ?? topLevelTimestamp
      };
    }
    if (payloadType) {
      return { type: payloadType, item, timestamp: itemTimestamp ?? topLevelTimestamp };
    }
  }

  if (raw.type === "response_item") {
    const payloadType = asNonEmptyString(getField(item, "type") as unknown);
    if (payloadType === "message") {
      const role = asNonEmptyString(getField(item, "role") as unknown);
      const content = extractMessageText(getField(item, "content"));
      if (role === "user" || role === "assistant") {
        return {
          type: role === "user" ? "user_message" : "assistant_message",
          item: {
            ...item,
            ...(content ? { content } : {})
          },
          timestamp: itemTimestamp ?? topLevelTimestamp
        };
      }
    }
    if (payloadType) {
      return { type: payloadType, item, timestamp: itemTimestamp ?? topLevelTimestamp };
    }
  }

  return { type: raw.type, item, timestamp: itemTimestamp ?? topLevelTimestamp };
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
  const metaEvent = events.find((e) => normalizeRawCodexEvent(e).type === "session_meta");
  if (!metaEvent) return {};
  const normalized = normalizeRawCodexEvent(metaEvent);
  const item = normalized.item;
  return {
    sessionId: asNonEmptyString(getField(item, "session_id", "id") as unknown) ?? undefined,
    cwd: asNonEmptyString(item.cwd) ?? undefined,
    model: asNonEmptyString(item.model) ?? undefined,
    timestamp: asNonEmptyString(item.timestamp) ?? normalized.timestamp
  };
}

/**
 * Prefixes that identify Codex-injected context blocks rather than real user
 * messages. These are prepended by the CLI/App before every session and should
 * not be used as the conversation title.
 */
const INJECTED_CONTEXT_PREFIXES = [
  "<environment_context>",
  "<user_instructions>",
  "<permissions instructions>",
  "# agents.md instructions for ",
];

function isInjectedContextMessage(content: string): boolean {
  const lower = content.trimStart().toLowerCase();
  return INJECTED_CONTEXT_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Extract a short title from the first genuine user message in the session.
 * Skips injected context blocks (environment_context, user_instructions,
 * AGENTS.md instructions, permissions instructions) that the Codex CLI/App
 * prepends automatically before real user prompts.
 */
export function extractCodexTitle(events: CodexRawEvent[]): string | undefined {
  for (const event of events) {
    const normalized = normalizeRawCodexEvent(event);
    if (normalized.type !== "user_message") continue;
    const content =
      asNonEmptyString(getField(normalized.item, "content") as unknown) ??
      extractMessageText(getField(normalized.item, "content"));
    if (!content) continue;
    if (isInjectedContextMessage(content)) continue;
    // Use first line, truncated to 120 chars
    const firstLine = content.split("\n")[0] ?? content;
    return firstLine.length > 120 ? `${firstLine.slice(0, 120)}…` : firstLine;
  }
  return undefined;
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
    const normalized = normalizeRawCodexEvent(raw);
    const { item, timestamp } = normalized;

    switch (normalized.type) {
      case "session_meta": {
        // Session metadata — emit as a status event
        const model = asNonEmptyString(getField(item, "model") as unknown);
        const cwd = asNonEmptyString(getField(item, "cwd") as unknown);
        const sessionId = asNonEmptyString(getField(item, "session_id", "id") as unknown);
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
        const content = extractInlineText(item) ?? "";
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
        const content = extractInlineText(item) ?? "";
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
        const content = extractInlineText(item) ?? "";
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
        const toolResultTruncated = rawResultText !== undefined && rawResultText !== resultText ? true : undefined;
        events.push({
          id: `tool_result_${index}`,
          index,
          source: "codex",
          kind: "tool",
          stepType: "tool_result",
          title: `${toolName} result`,
          output: resultText,
          ...(toolResultTruncated ? { outputTruncated: toolResultTruncated } : {}),
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
        const fnResultTruncated = rawResultText !== undefined && rawResultText !== resultText ? true : undefined;
        events.push({
          id: `fn_result_${index}`,
          index,
          source: "codex",
          kind: "tool",
          stepType: normalized.type,
          title: `${name} result`,
          output: resultText,
          ...(fnResultTruncated ? { outputTruncated: fnResultTruncated } : {}),
          exitCode,
          createdAt: timestamp
        });
        break;
      }

      case "exec":
      case "shell":
      case "command":
      case "local_shell_call":
      case "local_shell_call_output": {
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
          stepType: normalized.type,
          title: cmd || normalized.type,
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
        const msg = asNonEmptyString(getField(item, "message", "content", "error") as unknown) ?? normalized.type;
        events.push({
          id: `${normalized.type}_${index}`,
          index,
          source: "codex",
          kind: normalized.type === "error" ? "other" : "status",
          stepType: normalized.type,
          title: normalized.type === "error" ? "Error" : "System",
          text: msg,
          status: normalized.type === "error" ? "ERROR" : undefined,
          createdAt: timestamp
        });
        break;
      }

      default: {
        // Emit unknown event types as "other" so nothing is silently dropped
        const text =
          asNonEmptyString(getField(item, "content", "message", "text") as unknown) ??
          extractMessageText(getField(item, "content"));
        events.push({
          id: `other_${normalized.type}_${index}`,
          index,
          source: "codex",
          kind: "other",
          stepType: normalized.type,
          title: normalized.type,
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
