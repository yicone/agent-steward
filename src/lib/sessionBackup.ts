import crypto from "node:crypto";

import {
  SESSION_BACKUP_SCHEMA_VERSION,
  SESSION_RECORD_SCHEMA_VERSION,
  type SessionBackupManifest,
  type SessionBackupManifestRecord,
  type SessionRecord
} from "@/lib/sessionRecord";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonObject(value: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON: ${message}`);
  }

  if (!isObject(parsed)) {
    throw new Error("Expected a JSON object");
  }

  return parsed;
}

export function buildSessionBackupManifest(records: SessionBackupManifestRecord[]): SessionBackupManifest {
  return {
    schemaVersion: SESSION_BACKUP_SCHEMA_VERSION,
    backupId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    createdBy: "agent-switch",
    sessionCount: records.length,
    records
  };
}

export function validateSessionBackupManifest(manifest: SessionBackupManifest): void {
  if (manifest.schemaVersion !== SESSION_BACKUP_SCHEMA_VERSION) {
    throw new Error(`Unsupported session backup schema version: ${manifest.schemaVersion}`);
  }
  if (manifest.createdBy !== "agent-switch" && manifest.createdBy !== "agent-storage-manager") {
    throw new Error(`Unsupported session backup creator: ${manifest.createdBy}`);
  }
  if (!Array.isArray(manifest.records)) {
    throw new Error("Session backup manifest records must be an array");
  }
  if (manifest.sessionCount !== manifest.records.length) {
    throw new Error("Session backup manifest sessionCount does not match records length");
  }

  for (const record of manifest.records) {
    if (!record.sessionId || !record.path) {
      throw new Error("Session backup manifest records must include sessionId and path");
    }
  }
}

export function validateSessionRecord(record: SessionRecord): void {
  if (record.schemaVersion !== SESSION_RECORD_SCHEMA_VERSION) {
    throw new Error(`Unsupported session record schema version: ${record.schemaVersion}`);
  }
  if (!record.session?.id) {
    throw new Error("Session record must include session.id");
  }
  if (!record.session?.source) {
    throw new Error("Session record must include session.source");
  }
  if (!record.sourceRef?.kind || !record.sourceRef?.locator) {
    throw new Error("Session record must include sourceRef.kind and sourceRef.locator");
  }
  if (!record.provenance?.capturedAt || !record.provenance?.capturedBy) {
    throw new Error("Session record must include provenance.capturedAt and provenance.capturedBy");
  }
  if (!record.timestamps?.capturedAt) {
    throw new Error("Session record must include timestamps.capturedAt");
  }
  if (!record.summary) {
    throw new Error("Session record must include summary");
  }
  if (!Array.isArray(record.events)) {
    throw new Error("Session record events must be an array");
  }
}

export function serializeSessionBackupManifest(manifest: SessionBackupManifest): string {
  validateSessionBackupManifest(manifest);
  return JSON.stringify(manifest, null, 2);
}

export function parseSessionBackupManifest(raw: string): SessionBackupManifest {
  const parsed = parseJsonObject(raw) as unknown as SessionBackupManifest;
  validateSessionBackupManifest(parsed);
  return parsed;
}

export function serializeSessionRecord(record: SessionRecord): string {
  validateSessionRecord(record);
  return JSON.stringify(record, null, 2);
}

export function parseSessionRecord(raw: string): SessionRecord {
  const parsed = parseJsonObject(raw) as unknown as SessionRecord;
  validateSessionRecord(parsed);
  return parsed;
}
