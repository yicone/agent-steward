import type { ChatMessage } from "../types";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeWindsurfStepsToMessages(steps: unknown[]): ChatMessage[] {
  const messages: ChatMessage[] = [];

  for (const step of steps) {
    if (!step || typeof step !== "object") continue;
    const s = step as Record<string, any>;

    const userInput = s.userInput;
    if (userInput && typeof userInput === "object") {
      const query = asNonEmptyString(userInput.query);
      const userResponse = asNonEmptyString(userInput.userResponse);
      const text = query ?? userResponse;
      if (text) {
        messages.push({ role: "user", text });
        continue;
      }
    }

    const plannerResponse = s.plannerResponse;
    if (plannerResponse && typeof plannerResponse === "object") {
      const modified = asNonEmptyString(plannerResponse.modifiedResponse);
      const response = asNonEmptyString(plannerResponse.response);
      const text = modified ?? response;
      if (text) {
        messages.push({ role: "assistant", text });
        continue;
      }
    }

    const systemMessage = s.systemMessage;
    if (systemMessage && typeof systemMessage === "object") {
      const message = asNonEmptyString(systemMessage.message);
      const text = message ?? asNonEmptyString(systemMessage.text) ?? asNonEmptyString(systemMessage.content);
      if (text) {
        messages.push({ role: "system", text });
        continue;
      }
    }

    const title =
      asNonEmptyString(s.type) ??
      asNonEmptyString(s.stepType) ??
      asNonEmptyString(s.kind) ??
      "STEP";

    messages.push({
      role: "tool",
      title,
      payload: step
    });
  }

  return messages;
}
