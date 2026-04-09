import type { ChatMessage, ConversationListItem, TrajectoryEvent, TrajectorySummary } from "@/lib/types";

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
    subagentCount: 0,
    errorCount: 0
  };

  for (const event of events) {
    if (event.kind === "user") summary.userCount += 1;
    if (event.kind === "assistant") summary.assistantCount += 1;
    if (event.kind === "thought") summary.thoughtCount += 1;
    if (event.kind === "tool") summary.toolCount += 1;
    if (event.kind === "command") summary.commandCount += 1;
    if (event.kind === "subagent") summary.subagentCount += 1;
    if (isErrorLikeTrajectoryEvent(event)) summary.errorCount += 1;
  }

  return summary;
}

/**
 * Returns true if the event matches the given search query.
 * Searches across: title, text, output, stepType, commandLine, tool call names, and subagent fields.
 * Pass an empty string to match all events.
 */
export function matchesEventSearch(event: TrajectoryEvent, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (event.title.toLowerCase().includes(q)) return true;
  if (event.text?.toLowerCase().includes(q)) return true;
  if (event.output?.toLowerCase().includes(q)) return true;
  if (event.stepType.toLowerCase().includes(q)) return true;
  if (event.commandLine?.toLowerCase().includes(q)) return true;
  if (event.toolCalls?.some((tc) => tc.name?.toLowerCase().includes(q))) return true;
  // Search subagent fields
  if (event.subagent) {
    if (event.subagent.type?.toLowerCase().includes(q)) return true;
    if (event.subagent.taskName?.toLowerCase().includes(q)) return true;
    if (event.subagent.taskDescription?.toLowerCase().includes(q)) return true;
    if (event.subagent.antigravityStepType?.toLowerCase().includes(q)) return true;
    if (event.subagent.codexFunctionName?.toLowerCase().includes(q)) return true;
  }
  return false;
}

/**
 * Returns true if the conversation list item matches the given search query.
 * Searches across: title (or id when no title is set), and cwd.
 * When a title is present the id is an opaque internal identifier and is
 * intentionally excluded — searching it would cause every Codex session
 * (whose id always starts with "rollout-") to match the query "rollout"
 * regardless of its human-readable title.
 * Pass an empty string to match all items.
 */
export function matchesConversationSearch(item: ConversationListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (item.title ? item.title.toLowerCase().includes(q) : item.id.toLowerCase().includes(q)) return true;
  if (item.cwd?.toLowerCase().includes(q)) return true;
  return false;
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
