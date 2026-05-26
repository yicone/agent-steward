import type { Source, TrajectoryEvent, TrajectorySummary } from "@/lib/types";

export const SESSION_RECORD_SCHEMA_VERSION = "session-record/v1" as const;
export const SESSION_BACKUP_SCHEMA_VERSION = "session-backup/v1" as const;

export type SessionRecordSchemaVersion = typeof SESSION_RECORD_SCHEMA_VERSION;
export type SessionBackupSchemaVersion = typeof SESSION_BACKUP_SCHEMA_VERSION;

export type SessionSourceRefKind = "file" | "sqlite" | "app_storage" | "runtime_rpc" | "unknown";

export type SessionRecordIdentity = {
  id: string;
  source: Source;
  sourceSessionId?: string;
  rootId?: string;
  title?: string;
  cwd?: string;
  gitBranch?: string;
  model?: string;
};

export type SessionRecordSourceRef = {
  kind: SessionSourceRefKind;
  /**
   * Canonical locator for the original source. This may be a file path,
   * database identifier, runtime URI, or another source-specific locator.
   */
  locator: string;
  snapshotTime?: string;
};

export type SessionRecordProvenance = {
  capturedBy: "agent-switch" | "agent-storage-manager";
  capturedAt: string;
  /**
   * Product normalizer/build identifier used to produce this record.
   * Keep this flexible so implementation can adopt semver, git SHA, or both.
   */
  normalizerVersion?: string;
  importedFromBackup?: boolean;
  backupId?: string;
};

export type SessionRecordTimestamps = {
  startedAt?: string;
  lastEventAt?: string;
  capturedAt: string;
};

/**
 * Source-specific metadata that should not leak into the portable core schema.
 * Keep this value JSON-serializable.
 */
export type SessionRecordExtensions = Record<string, unknown>;

export type SessionRecord = {
  schemaVersion: SessionRecordSchemaVersion;
  session: SessionRecordIdentity;
  sourceRef: SessionRecordSourceRef;
  provenance: SessionRecordProvenance;
  timestamps: SessionRecordTimestamps;
  summary: TrajectorySummary;
  events: TrajectoryEvent[];
  extensions?: SessionRecordExtensions;
};

export type SessionBackupManifestRecord = {
  sessionId: string;
  path: string;
  sha256?: string;
  includesSourceCopy: boolean;
};

export type SessionBackupManifest = {
  schemaVersion: SessionBackupSchemaVersion;
  backupId: string;
  createdAt: string;
  createdBy: "agent-switch" | "agent-storage-manager";
  sessionCount: number;
  records: SessionBackupManifestRecord[];
};

export type SessionBackupPackage = {
  manifest: SessionBackupManifest;
  records: SessionRecord[];
};
