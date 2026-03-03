import type { ChatMessage, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { summarizeTrajectoryEvents, trajectoryEventsToChatMessages } from "@/lib/parse/trajectory";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function pickObject<T extends object = Record<string, any>>(value: unknown): T | null {
  if (!value || typeof value !== "object") return null;
  return value as T;
}

function getField(obj: unknown, camel: string, snake?: string): unknown {
  const o = pickObject(obj);
  if (!o) return undefined;
  if (camel in o) return (o as any)[camel];
  if (snake && snake in o) return (o as any)[snake];
  return undefined;
}

const STEP_TYPE_PREFIX = "CORTEX_STEP_TYPE_";

function stepTypeLabel(stepType: string): string {
  const token = stepType.startsWith(STEP_TYPE_PREFIX) ? stepType.slice(STEP_TYPE_PREFIX.length) : stepType;
  return token
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[truncated]`;
}

export function normalizeWindsurfStepsToTrajectoryEvents(
  steps: unknown[],
  opts?: { includeCleared?: boolean }
): {
  events: TrajectoryEvent[];
  summary: TrajectorySummary;
} {
  const events: TrajectoryEvent[] = [];
  const includeCleared = opts?.includeCleared ?? false;

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step || typeof step !== "object") continue;
    const s = step as Record<string, any>;
    const stepType =
      asNonEmptyString(s.type) ??
      asNonEmptyString(s.stepType) ??
      asNonEmptyString(s.kind) ??
      "CORTEX_STEP_TYPE_UNKNOWN";
    const status = asNonEmptyString(s.status) ?? undefined;
    const createdAt = asNonEmptyString(s?.metadata?.createdAt) ?? undefined;
    const completedAt = asNonEmptyString(s?.metadata?.completedAt) ?? undefined;
    const executionId = asNonEmptyString(s?.metadata?.executionId) ?? undefined;

    // Windsurf can keep the step metadata but clear the payload (especially after restarts).
    // The app typically hides these, so we skip them for a closer match.
    if (status === "CORTEX_STEP_STATUS_CLEARED" && !includeCleared) continue;

    const push = (
      kind: TrajectoryEvent["kind"],
      title: string,
      extra: Omit<TrajectoryEvent, "id" | "index" | "source" | "kind" | "stepType" | "title" | "status" | "createdAt" | "completedAt" | "executionId">
    ) => {
      events.push({
        id: `${index}-${events.length}-${kind}`,
        index,
        source: "windsurf",
        kind,
        stepType,
        title,
        ...(status ? { status } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(completedAt ? { completedAt } : {}),
        ...(executionId ? { executionId } : {}),
        ...extra
      });
    };

    const userInput = getField(s, "userInput", "user_input");
    if (userInput && typeof userInput === "object") {
      const query = asNonEmptyString(getField(userInput, "query") ?? (userInput as any).query);
      const userResponse = asNonEmptyString(getField(userInput, "userResponse", "user_response") ?? (userInput as any).userResponse);
      const text =
        query ??
        userResponse ??
        asNonEmptyString(getField(userInput, "text") ?? (userInput as any).text) ??
        asNonEmptyString(getField(userInput, "content") ?? (userInput as any).content) ??
        asNonEmptyString(getField(userInput, "message") ?? (userInput as any).message);
      if (text) {
        push("user", "User", { text });
        continue;
      }
    }

    const plannerResponse = getField(s, "plannerResponse", "planner_response");
    if (plannerResponse && typeof plannerResponse === "object") {
      const thinking = asNonEmptyString(getField(plannerResponse, "thinking") ?? (plannerResponse as any).thinking);
      if (thinking) {
        push("thought", "Thinking", { text: truncate(thinking, 12000) });
      }

      const modified = asNonEmptyString(getField(plannerResponse, "modifiedResponse", "modified_response") ?? (plannerResponse as any).modifiedResponse);
      const response = asNonEmptyString(getField(plannerResponse, "response") ?? (plannerResponse as any).response);
      const text = modified ?? response;
      if (text) {
        push("assistant", "Assistant", { text: truncate(text, 16000) });
        continue;
      }
    }

    const systemMessage = getField(s, "systemMessage", "system_message");
    if (systemMessage && typeof systemMessage === "object") {
      const message = asNonEmptyString(getField(systemMessage, "message") ?? (systemMessage as any).message);
      const text =
        message ??
        asNonEmptyString(getField(systemMessage, "text") ?? (systemMessage as any).text) ??
        asNonEmptyString(getField(systemMessage, "content") ?? (systemMessage as any).content);
      if (text) {
        push("status", "System", { text: truncate(text, 8000) });
        continue;
      }
    }

    push("tool", stepTypeLabel(stepType), {
      output: truncate(JSON.stringify(step, null, 2), 5000),
      outputTruncated: JSON.stringify(step).length > 5000
    });
  }

  return { events, summary: summarizeTrajectoryEvents(events, steps.length) };
}

export function normalizeWindsurfStepsToMessages(steps: unknown[], opts?: { includeCleared?: boolean }): ChatMessage[] {
  const { events } = normalizeWindsurfStepsToTrajectoryEvents(steps, opts);
  return trajectoryEventsToChatMessages(events);
}
