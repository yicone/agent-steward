import type { ChatMessage, TrajectoryEvent, TrajectorySummary } from "@/lib/types";

export function isErrorLikeTrajectoryEvent(event: TrajectoryEvent): boolean {
  if (event.title === "Error") return true;
  if (event.status?.includes("ERROR")) return true;
  if (typeof event.exitCode === "number" && event.exitCode !== 0) return true;
  return false;
}

export function summarizeTrajectoryEvents(events: TrajectoryEvent[], totalSteps: number): TrajectorySummary {
  const summary: TrajectorySummary = {
    totalSteps,
    renderedEvents: events.length,
    userCount: 0,
    assistantCount: 0,
    thoughtCount: 0,
    toolCount: 0,
    commandCount: 0,
    errorCount: 0
  };

  for (const event of events) {
    if (event.kind === "user") summary.userCount += 1;
    if (event.kind === "assistant") summary.assistantCount += 1;
    if (event.kind === "thought") summary.thoughtCount += 1;
    if (event.kind === "tool") summary.toolCount += 1;
    if (event.kind === "command") summary.commandCount += 1;
    if (isErrorLikeTrajectoryEvent(event)) summary.errorCount += 1;
  }

  return summary;
}

export function trajectoryEventsToChatMessages(events: TrajectoryEvent[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const event of events) {
    if (event.kind === "user" && event.text) {
      messages.push({ role: "user", text: event.text });
      continue;
    }
    if ((event.kind === "assistant" || event.kind === "thought") && event.text) {
      messages.push({ role: "assistant", text: event.text });
      continue;
    }
    if (event.kind === "status" && event.text) {
      messages.push({ role: "system", text: event.text });
      continue;
    }
    messages.push({ role: "tool", title: event.title, payload: event });
  }
  return messages;
}
