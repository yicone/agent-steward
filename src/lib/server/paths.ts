import "server-only";

import os from "node:os";
import path from "node:path";

export function getAgentStorageManagerDir(): string {
  return path.join(os.homedir(), ".agent-steward");
}

export function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/") || p.startsWith("~\\")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function getSessionBackupsRoot(): string {
  const override = process.env.AGENT_STEWARD_BACKUP_ROOT;
  if (override && override.trim().length) return expandHome(override.trim());
  return path.join(getAgentStorageManagerDir(), "backups");
}

export function getProjectBundlesRoot(): string {
  const override = process.env.AGENT_STEWARD_PROJECT_BUNDLE_ROOT;
  if (override && override.trim().length) return expandHome(override.trim());
  return path.join(getAgentStorageManagerDir(), "project-bundles");
}

/** Managed local roots for continuity Work Items and immutable Work Packages. */
export function getWorkItemsRoot(): string {
  const override = process.env.AGENT_STEWARD_WORK_ITEM_ROOT;
  if (override && override.trim().length) return expandHome(override.trim());
  return path.join(getAgentStorageManagerDir(), "work-items");
}

export function getWorkPackagesRoot(): string {
  const override = process.env.AGENT_STEWARD_WORK_PACKAGE_ROOT;
  if (override && override.trim().length) return expandHome(override.trim());
  return path.join(getAgentStorageManagerDir(), "work-packages");
}

// Aliases kept explicit for callers that use the singular domain terminology.
export const getWorkItemRoot = getWorkItemsRoot;
export const getWorkPackageRoot = getWorkPackagesRoot;
