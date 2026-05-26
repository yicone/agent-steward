import type { ConversationMeta, Source, TrajectoryContent, TrajectoryEvent } from "@/lib/types";
import {
  SESSION_RECORD_SCHEMA_VERSION,
  type SessionRecord,
  type SessionRecordExtensions,
  type SessionRecordProvenance,
  type SessionRecordSourceRef
} from "@/lib/sessionRecord";

export type ToSessionRecordInput = {
  sessionId: string;
  source: Source;
  sourceRef: SessionRecordSourceRef;
  content: TrajectoryContent;
  meta?: ConversationMeta;
  session?: {
    sourceSessionId?: string;
    rootId?: string;
  };
  provenance?: Partial<SessionRecordProvenance>;
  extensions?: SessionRecordExtensions;
};

function firstEventTimestamp(events: TrajectoryEvent[]): string | undefined {
  for (const event of events) {
    if (event.createdAt) return event.createdAt;
    if (event.completedAt) return event.completedAt;
  }
  return undefined;
}

function lastEventTimestamp(events: TrajectoryEvent[]): string | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    if (!event) continue;
    if (event.completedAt) return event.completedAt;
    if (event.createdAt) return event.createdAt;
  }
  return undefined;
}

export function toSessionRecord(input: ToSessionRecordInput): SessionRecord {
  const capturedAt = input.provenance?.capturedAt ?? new Date().toISOString();

  return {
    schemaVersion: SESSION_RECORD_SCHEMA_VERSION,
    session: {
      id: input.sessionId,
      source: input.source,
      sourceSessionId: input.session?.sourceSessionId,
      rootId: input.session?.rootId,
      title: input.meta?.title,
      cwd: input.meta?.cwd,
      gitBranch: input.meta?.gitBranch,
      model: input.meta?.model
    },
    sourceRef: input.sourceRef,
    provenance: {
      capturedBy: "agent-switch",
      capturedAt,
      importedFromBackup: false,
      ...input.provenance
    },
    timestamps: {
      capturedAt,
      startedAt: firstEventTimestamp(input.content.events),
      lastEventAt: lastEventTimestamp(input.content.events)
    },
    summary: input.content.summary,
    events: input.content.events,
    ...(input.extensions ? { extensions: input.extensions } : {})
  };
}
