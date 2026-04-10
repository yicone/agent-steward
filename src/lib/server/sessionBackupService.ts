import "server-only";

import crypto from "node:crypto";

import {
  buildSessionBackupManifest,
  parseSessionBackupManifest,
  parseSessionRecord,
  serializeSessionBackupManifest,
  serializeSessionRecord
} from "@/lib/sessionBackup";
import type { SessionBackupManifest, SessionRecord } from "@/lib/sessionRecord";
import {
  ensureBackupDir,
  ensureBackupRoot,
  getBackupDirPath,
  getBackupManifestPath,
  readBackupFile,
  readBackupManifestFile,
  writeBackupFile
} from "@/lib/server/sessionBackupStore";

export type SessionBackupSourceCopyInput = {
  sessionId: string;
  relativePath: string;
  content: string | Buffer;
};

export type WriteSessionBackupPackageInput = {
  records: SessionRecord[];
  sourceCopies?: SessionBackupSourceCopyInput[];
  backupId?: string;
};

export type SessionBackupPackageReadResult = {
  backupDir: string;
  manifestPath: string;
  manifest: SessionBackupManifest;
  records: SessionRecord[];
};

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export async function writeSessionBackupPackage(input: WriteSessionBackupPackageInput): Promise<SessionBackupPackageReadResult> {
  await ensureBackupRoot();

  const serializedRecords = input.records.map((record) => {
    const json = serializeSessionRecord(record);
    return {
      sessionId: record.session.id,
      json,
      path: `sessions/${record.session.id}.record.json`,
      sha256: sha256(json)
    };
  });

  const manifest = buildSessionBackupManifest(
    serializedRecords.map((record) => ({
      sessionId: record.sessionId,
      path: record.path,
      sha256: record.sha256,
      includesSourceCopy: Boolean(input.sourceCopies?.some((copy) => copy.sessionId === record.sessionId))
    }))
  );

  if (input.backupId) {
    manifest.backupId = input.backupId;
  }

  await ensureBackupDir(manifest.backupId);

  for (const record of serializedRecords) {
    await writeBackupFile(manifest.backupId, record.path, record.json);
  }

  for (const copy of input.sourceCopies ?? []) {
    await writeBackupFile(manifest.backupId, `sources/${copy.sessionId}/${copy.relativePath}`, copy.content);
  }

  await writeBackupFile(manifest.backupId, "manifest.json", serializeSessionBackupManifest(manifest));

  return {
    backupDir: getBackupDirPath(manifest.backupId),
    manifestPath: getBackupManifestPath(manifest.backupId),
    manifest,
    records: input.records
  };
}

export async function readSessionBackupPackage(backupId: string): Promise<SessionBackupPackageReadResult> {
  const manifest = parseSessionBackupManifest(await readBackupManifestFile(backupId));
  const records: SessionRecord[] = [];

  for (const entry of manifest.records) {
    const raw = (await readBackupFile(backupId, entry.path)).toString("utf8");
    if (entry.sha256 && sha256(raw) !== entry.sha256) {
      throw new Error(`Session backup record checksum mismatch: ${entry.sessionId}`);
    }
    records.push(parseSessionRecord(raw));
  }

  return {
    backupDir: getBackupDirPath(backupId),
    manifestPath: getBackupManifestPath(backupId),
    manifest,
    records
  };
}

export async function importSessionBackupPackage(backupId: string): Promise<SessionBackupPackageReadResult & { importedAt: string }> {
  const pkg = await readSessionBackupPackage(backupId);
  return {
    ...pkg,
    importedAt: new Date().toISOString()
  };
}
