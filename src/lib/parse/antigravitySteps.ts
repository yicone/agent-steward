import type {
  AntigravityToolCall,
  AntigravityTrajectoryEvent,
  AntigravityTrajectoryEventKind,
  AntigravityTrajectorySummary
} from "@/lib/types";

const ESCAPE_SEQUENCE = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
const STEP_TYPE_PREFIX = "CORTEX_STEP_TYPE_";

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function stripAnsi(text: string): string {
  return text.replace(ESCAPE_SEQUENCE, "");
}

function truncateText(
  text: string,
  maxChars: number
): {
  text: string;
  truncated: boolean;
} {
  if (text.length <= maxChars) return { text, truncated: false };
  const suffix = "\n\n[truncated]";
  return {
    text: `${text.slice(0, maxChars)}${suffix}`,
    truncated: true
  };
}

function safeStepType(stepType: unknown): string {
  const raw = asNonEmptyString(stepType);
  if (!raw) return "CORTEX_STEP_TYPE_UNKNOWN";
  return raw;
}

function stepTypeLabel(stepType: string): string {
  const token = stepType.startsWith(STEP_TYPE_PREFIX) ? stepType.slice(STEP_TYPE_PREFIX.length) : stepType;
  return token
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractOutputText(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return asNonEmptyString(stripAnsi(value));
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const candidates = [obj.full, obj.combined, obj.delta, obj.text];
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const out = asNonEmptyString(stripAnsi(candidate));
      if (out) return out;
    }
  }
  return null;
}

function parseToolCalls(value: unknown): AntigravityToolCall[] {
  if (!Array.isArray(value)) return [];
  const out: AntigravityToolCall[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const call = item as Record<string, unknown>;
    const id = asNonEmptyString(call.id);
    const name = asNonEmptyString(call.name);
    const args = asNonEmptyString(call.argumentsJson);
    out.push({
      ...(id ? { id } : {}),
      ...(name ? { name } : {}),
      ...(args && args !== "{}" ? { argumentsJson: truncateText(args, 4000).text } : {})
    });
  }
  return out;
}

function hasAnyOwnKeys(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && Object.keys(value as object).length);
}

export function normalizeAntigravityTrajectoryToEvents(params: {
  trajectory: unknown;
}): {
  events: AntigravityTrajectoryEvent[];
  summary: AntigravityTrajectorySummary;
} {
  const trajectoryObj = params.trajectory && typeof params.trajectory === "object" ? (params.trajectory as Record<string, unknown>) : {};
  const steps: unknown[] = Array.isArray(trajectoryObj.steps) ? trajectoryObj.steps : [];

  const events: AntigravityTrajectoryEvent[] = [];
  const lastCommandStatus = new Map<string, string>();

  const summary: AntigravityTrajectorySummary = {
    totalSteps: steps.length,
    renderedEvents: 0,
    userCount: 0,
    assistantCount: 0,
    thoughtCount: 0,
    toolCount: 0,
    commandCount: 0,
    errorCount: 0
  };

  const pushEvent = (
    index: number,
    stepType: string,
    kind: AntigravityTrajectoryEventKind,
    data: Omit<AntigravityTrajectoryEvent, "id" | "index" | "kind" | "stepType">
  ) => {
    const event: AntigravityTrajectoryEvent = {
      id: `${index}-${events.length}-${kind}`,
      index,
      kind,
      stepType,
      ...data
    };
    events.push(event);
    summary.renderedEvents += 1;
    if (kind === "user") summary.userCount += 1;
    if (kind === "assistant") summary.assistantCount += 1;
    if (kind === "thought") summary.thoughtCount += 1;
    if (kind === "tool") summary.toolCount += 1;
    if (kind === "command") summary.commandCount += 1;
    if (data.status?.includes("ERROR")) summary.errorCount += 1;
    if (typeof data.exitCode === "number" && data.exitCode !== 0) summary.errorCount += 1;
  };

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (!step || typeof step !== "object") continue;
    const s = step as Record<string, any>;

    const stepType = safeStepType(s.type);
    const status = asNonEmptyString(s.status) ?? undefined;
    const createdAt = asNonEmptyString(s?.metadata?.createdAt) ?? undefined;
    const completedAt = asNonEmptyString(s?.metadata?.completedAt) ?? undefined;

    if (stepType === "CORTEX_STEP_TYPE_USER_INPUT") {
      const text = asNonEmptyString(s?.userInput?.userResponse) ?? asNonEmptyString(s?.userInput?.query);
      if (text) {
        pushEvent(index, stepType, "user", {
          title: "User",
          text,
          status,
          createdAt,
          completedAt
        });
      }
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_PLANNER_RESPONSE") {
      const thinking = asNonEmptyString(s?.plannerResponse?.thinking);
      if (thinking) {
        const clipped = truncateText(thinking, 12000);
        pushEvent(index, stepType, "thought", {
          title: "Thinking",
          text: clipped.text,
          status,
          createdAt,
          completedAt
        });
      }

      const toolCalls = parseToolCalls(s?.plannerResponse?.toolCalls);
      if (toolCalls.length) {
        pushEvent(index, stepType, "tool", {
          title: `Planned Tool Calls (${toolCalls.length})`,
          text: toolCalls.map((x) => x.name ?? "tool").join(", "),
          toolCalls,
          status,
          createdAt,
          completedAt
        });
      }

      const responseText =
        asNonEmptyString(s?.plannerResponse?.modifiedResponse) ??
        asNonEmptyString(s?.plannerResponse?.response);
      if (responseText) {
        const clipped = truncateText(responseText, 16000);
        pushEvent(index, stepType, "assistant", {
          title: "Assistant",
          text: clipped.text,
          status,
          createdAt,
          completedAt
        });
      }
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_RUN_COMMAND") {
      const commandLine = asNonEmptyString(s?.runCommand?.commandLine) ?? undefined;
      const cwd = asNonEmptyString(s?.runCommand?.cwd) ?? undefined;
      const exitCode = typeof s?.runCommand?.exitCode === "number" ? s.runCommand.exitCode : undefined;
      const outputText = extractOutputText(s?.runCommand?.combinedOutput ?? s?.runCommand?.combinedOutputSnapshot);
      const clipped = outputText ? truncateText(outputText, 20000) : null;
      pushEvent(index, stepType, "command", {
        title: commandLine ? "Run Command" : stepTypeLabel(stepType),
        text: commandLine,
        commandLine,
        cwd,
        exitCode,
        ...(clipped ? { output: clipped.text, outputTruncated: clipped.truncated } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_COMMAND_STATUS") {
      const commandId = asNonEmptyString(s?.commandStatus?.commandId) ?? "unknown";
      const commandStatus = asNonEmptyString(s?.commandStatus?.status) ?? status ?? "UNKNOWN";
      const last = lastCommandStatus.get(commandId);
      if (last === commandStatus) continue;
      lastCommandStatus.set(commandId, commandStatus);
      pushEvent(index, stepType, "status", {
        title: "Command Status",
        text: `${commandId}: ${commandStatus}`,
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_VIEW_FILE") {
      const uri = asNonEmptyString(s?.viewFile?.absolutePathUri) ?? asNonEmptyString(s?.viewFile?.absoluteUri);
      const numLines = typeof s?.viewFile?.numLines === "number" ? s.viewFile.numLines : undefined;
      pushEvent(index, stepType, "tool", {
        title: "View File",
        text: uri ?? "file",
        ...(numLines ? { output: `Lines: ${numLines}` } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_LIST_DIRECTORY") {
      const dir = asNonEmptyString(s?.listDirectory?.directoryPathUri);
      const resultsCount = Array.isArray(s?.listDirectory?.results) ? s.listDirectory.results.length : undefined;
      pushEvent(index, stepType, "tool", {
        title: "List Directory",
        text: dir ?? "directory",
        ...(typeof resultsCount === "number" ? { output: `Entries: ${resultsCount}` } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_GREP_SEARCH") {
      const query = asNonEmptyString(s?.grepSearch?.query);
      const path = asNonEmptyString(s?.grepSearch?.searchPathUri);
      const results = typeof s?.grepSearch?.totalResults === "number" ? s.grepSearch.totalResults : undefined;
      pushEvent(index, stepType, "tool", {
        title: "Grep Search",
        text: query ?? "search",
        ...(path ? { output: `${path}${typeof results === "number" ? ` • ${results} results` : ""}` } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_FIND") {
      const pattern = asNonEmptyString(s?.find?.pattern);
      const directory = asNonEmptyString(s?.find?.searchDirectory);
      const totalResults = typeof s?.find?.totalResults === "number" ? s.find.totalResults : undefined;
      pushEvent(index, stepType, "tool", {
        title: "Find",
        text: pattern ?? "find",
        ...(directory ? { output: `${directory}${typeof totalResults === "number" ? ` • ${totalResults} results` : ""}` } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_SEARCH_WEB") {
      const query = asNonEmptyString(s?.searchWeb?.query);
      pushEvent(index, stepType, "tool", {
        title: "Search Web",
        text: query ?? "web search",
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_BROWSER_SUBAGENT") {
      const taskName = asNonEmptyString(s?.browserSubagent?.taskName);
      const task = asNonEmptyString(s?.browserSubagent?.task);
      const clippedTask = task ? truncateText(task, 5000) : null;
      pushEvent(index, stepType, "tool", {
        title: "Browser Subagent",
        text: taskName ?? "Browser task",
        ...(clippedTask ? { output: clippedTask.text, outputTruncated: clippedTask.truncated } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_SEND_COMMAND_INPUT") {
      const commandId = asNonEmptyString(s?.sendCommandInput?.commandId);
      const outputText = extractOutputText(s?.sendCommandInput?.output);
      const clipped = outputText ? truncateText(outputText, 10000) : null;
      pushEvent(index, stepType, "status", {
        title: "Send Command Input",
        text: commandId ?? "command input",
        ...(clipped ? { output: clipped.text, outputTruncated: clipped.truncated } : {}),
        status,
        createdAt,
        completedAt
      });
      continue;
    }

    if (stepType === "CORTEX_STEP_TYPE_ERROR_MESSAGE") {
      const fullError = asNonEmptyString(s?.errorMessage?.fullError);
      const shortError = asNonEmptyString(s?.errorMessage?.shortError);
      const userError = asNonEmptyString(s?.errorMessage?.userErrorMessage);
      const text = fullError ?? shortError ?? userError;
      if (text) {
        const clipped = truncateText(text, 8000);
        pushEvent(index, stepType, "status", {
          title: "Error",
          text: clipped.text,
          status,
          createdAt,
          completedAt
        });
      }
      continue;
    }

    const payloadKey = Object.keys(s).find((key) => key !== "type" && key !== "status" && key !== "metadata");
    const payload = payloadKey ? s[payloadKey] : null;
    if (!hasAnyOwnKeys(payload)) continue;

    const payloadJson = truncateText(JSON.stringify(payload, null, 2), 5000);
    pushEvent(index, stepType, "other", {
      title: stepTypeLabel(stepType),
      output: payloadJson.text,
      outputTruncated: payloadJson.truncated,
      status,
      createdAt,
      completedAt
    });
  }

  return { events, summary };
}

