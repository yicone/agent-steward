import "server-only";

import os from "node:os";
import path from "node:path";

export function getAgentStorageManagerDir(): string {
  return path.join(os.homedir(), ".agent-storage-manager");
}

export function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function getSessionBackupsRoot(): string {
  const override = process.env.AGENT_STORAGE_MANAGER_BACKUP_ROOT;
  if (override && override.trim().length) return expandHome(override.trim());
  return path.join(getAgentStorageManagerDir(), "backups");
}
