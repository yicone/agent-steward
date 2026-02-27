import type { ChatMessage, TrajectoryEvent, TrajectorySummary } from "@/lib/types";
import { summarizeTrajectoryEvents, trajectoryEventsToChatMessages } from "@/lib/parse/trajectory";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

export function normalizeWindsurfStepsToTrajectoryEvents(steps: unknown[]): {
  events: TrajectoryEvent[];
  summary: TrajectorySummary;
} {
  const events: TrajectoryEvent[] = [];

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

    const userInput = s.userInput;
    if (userInput && typeof userInput === "object") {
      const query = asNonEmptyString(userInput.query);
      const userResponse = asNonEmptyString(userInput.userResponse);
      const text = query ?? userResponse;
      if (text) {
        push("user", "User", { text });
        continue;
      }
    }

    const plannerResponse = s.plannerResponse;
    if (plannerResponse && typeof plannerResponse === "object") {
      const thinking = asNonEmptyString(plannerResponse.thinking);
      if (thinking) {
        push("thought", "Thinking", { text: truncate(thinking, 12000) });
      }

      const modified = asNonEmptyString(plannerResponse.modifiedResponse);
      const response = asNonEmptyString(plannerResponse.response);
      const text = modified ?? response;
      if (text) {
        push("assistant", "Assistant", { text: truncate(text, 16000) });
        continue;
      }
    }

    const systemMessage = s.systemMessage;
    if (systemMessage && typeof systemMessage === "object") {
      const message = asNonEmptyString(systemMessage.message);
      const text = message ?? asNonEmptyString(systemMessage.text) ?? asNonEmptyString(systemMessage.content);
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

export function normalizeWindsurfStepsToMessages(steps: unknown[]): ChatMessage[] {
  const { events } = normalizeWindsurfStepsToTrajectoryEvents(steps);
  return trajectoryEventsToChatMessages(events);
}
