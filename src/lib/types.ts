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

export type AntigravityTrajectoryEventKind =
  | "user"
  | "assistant"
  | "thought"
  | "tool"
  | "command"
  | "status"
  | "other";

export type AntigravityToolCall = {
  id?: string;
  name?: string;
  argumentsJson?: string;
};

export type AntigravityTrajectoryEvent = {
  id: string;
  index: number;
  kind: AntigravityTrajectoryEventKind;
  stepType: string;
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
  toolCalls?: AntigravityToolCall[];
};

export type AntigravityTrajectorySummary = {
  totalSteps: number;
  renderedEvents: number;
  userCount: number;
  assistantCount: number;
  thoughtCount: number;
  toolCount: number;
  commandCount: number;
  errorCount: number;
};

export type ConversationContent =
  | {
      kind: "markdown";
      markdown: string;
    }
  | {
      kind: "antigravity";
      markdown: string;
      events: AntigravityTrajectoryEvent[];
      summary: AntigravityTrajectorySummary;
    }
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
