export type Source = "antigravity" | "windsurf" | "codex";

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
  /** Root IDs that contain a session with the same id (excluding the item's own rootId). */
  duplicateRootIds?: string[];
};

export type RootHealthStatus = "healthy" | "missing" | "unreadable" | "slow";

export type RootHealth = {
  rootId: string;
  path: string;
  status: RootHealthStatus;
  /** Source-agnostic count: `.pb` files for antigravity/windsurf, `.jsonl` files for codex. */
  fileCount: number;
  scanMs: number;
  error?: string;
};

export type SourcesStatus = {
  antigravity: {
    discovered: boolean;
    attachMethod?: "log" | "legacy_discovery";
    discoveryPath?: string;
    pid?: number;
    pidAlive?: boolean;
    httpPort?: number;
    httpsPort?: number;
    csrfTokenPresent?: boolean;
    csrfTokenSource?: "ps_args" | "override" | "discovery_file" | "none";
    tokenRequired?: boolean;
    heartbeatOk?: boolean;
    lastError?: string;
    recommendedAction?: string;
    reachable?: boolean;
    error?: string;
  };
  windsurf: {
    attached: boolean;
    attachMethod?: "log";
    logPath?: string;
    pid?: number;
    pidAlive?: boolean;
    port?: number;
    csrfTokenPresent?: boolean;
    csrfTokenSource?: "ps_args" | "override" | "none";
    tokenRequired?: boolean;
    heartbeatOk?: boolean;
    lastError?: string;
    recommendedAction?: string;
    error?: string;
  };
  codex: {
    /** True if at least one session file was found in the configured roots. */
    sessionsFound: boolean;
    /** Directory where sessions were found, or first checked enabled root when none were found. */
    sessionsDir?: string;
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
