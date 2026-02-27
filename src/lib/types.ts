export type Source = "antigravity" | "windsurf";

export type RootConfig = {
  id: string;
  source: Source;
  path: string;
  enabled: boolean;
};

export type AppConfig = {
  schemaVersion: 1;
  roots: RootConfig[];
  windsurf: {
    csrfTokenOverride?: string;
  };
  ui: {
    defaultSource: Source;
    sortOrder: "mtime_desc";
  };
};

export type ConversationFile = {
  id: string;
  source: Source;
  rootId: string;
  path: string;
  sizeBytes: number;
  mtimeMs: number;
};

export type ConversationListItem = ConversationFile & {
  title?: string;
  cwd?: string;
};

export type SourcesStatus = {
  antigravity: {
    discovered: boolean;
    discoveryPath?: string;
    httpPort?: number;
    httpsPort?: number;
    csrfTokenPresent?: boolean;
    reachable?: boolean;
    error?: string;
  };
  windsurf: {
    attached: boolean;
    logPath?: string;
    pid?: number;
    port?: number;
    csrfTokenPresent?: boolean;
    error?: string;
  };
};

export type ChatMessage =
  | {
      role: "user" | "assistant" | "system";
      text: string;
    }
  | {
      role: "tool";
      title: string;
      payload: unknown;
    };

export type TrajectoryEventKind =
  | "user"
  | "assistant"
  | "thought"
  | "tool"
  | "command"
  | "status"
  | "other";

export type TrajectoryToolCall = {
  id?: string;
  name?: string;
  argumentsJson?: string;
};

export type TrajectoryEvent = {
  id: string;
  index: number;
  source: Source;
  kind: TrajectoryEventKind;
  stepType: string;
  executionId?: string;
  status?: string;
  title: string;
  text?: string;
  createdAt?: string;
  completedAt?: string;
  commandLine?: string;
  cwd?: string;
  exitCode?: number;
  output?: string;
  outputTruncated?: boolean;
  toolCalls?: TrajectoryToolCall[];
};

export type TrajectorySummary = {
  totalSteps: number;
  renderedEvents: number;
  userCount: number;
  assistantCount: number;
  thoughtCount: number;
  toolCount: number;
  commandCount: number;
  errorCount: number;
};

export type TrajectoryContent = {
  kind: "trajectory";
  source: Source;
  markdown?: string;
  events: TrajectoryEvent[];
  summary: TrajectorySummary;
  /**
   * For paged sources (e.g. Windsurf): the next step offset to request.
   * Semantics match `ChatContent.stepOffset`.
   */
  stepOffset?: number;
  numTotalSteps?: number;
};

export type AntigravityTrajectoryEventKind = TrajectoryEventKind;
export type AntigravityToolCall = TrajectoryToolCall;
export type AntigravityTrajectoryEvent = TrajectoryEvent;
export type AntigravityTrajectorySummary = TrajectorySummary;

export type ConversationContent =
  | {
      kind: "markdown";
      markdown: string;
    }
  | TrajectoryContent
  | {
      kind: "chat";
      messages: ChatMessage[];
      stepOffset: number;
      numTotalSteps?: number;
    };

export type ConversationMeta = {
  title?: string;
  cwd?: string;
};
