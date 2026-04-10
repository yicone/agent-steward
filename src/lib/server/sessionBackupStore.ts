import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import { getSessionBackupsRoot } from "@/lib/server/paths";

function validateBackupId(backupId: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(backupId)) {
    throw new Error(`Invalid backupId: ${backupId}`);
  }
}

function resolvePathWithin(baseDir: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Backup path must be relative: ${relativePath}`);
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, relativePath);
  const relative = path.relative(resolvedBase, resolvedTarget);

  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Backup path escapes managed backup root: ${relativePath}`);
  }

  return resolvedTarget;
}

export function getBackupRootPath(): string {
  return getSessionBackupsRoot();
}

export function getBackupDirPath(backupId: string): string {
  validateBackupId(backupId);
  return path.join(getBackupRootPath(), backupId);
}

export function getBackupManifestPath(backupId: string): string {
  return path.join(getBackupDirPath(backupId), "manifest.json");
}

export async function ensureBackupRoot(): Promise<string> {
  const root = getBackupRootPath();
  await fs.mkdir(root, { recursive: true });
  return root;
}

export async function ensureBackupDir(backupId: string): Promise<string> {
  const dir = getBackupDirPath(backupId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeBackupFile(
  backupId: string,
  relativePath: string,
  content: string | Buffer
): Promise<string> {
  const targetPath = resolvePathWithin(getBackupDirPath(backupId), relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content);
  return targetPath;
}

export async function readBackupFile(backupId: string, relativePath: string): Promise<Buffer> {
  const targetPath = resolvePathWithin(getBackupDirPath(backupId), relativePath);
  return fs.readFile(targetPath);
}

export async function readBackupManifestFile(backupId: string): Promise<string> {
  return fs.readFile(getBackupManifestPath(backupId), "utf-8");
}
