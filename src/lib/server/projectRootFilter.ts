import path from "node:path";

import { expandHome } from "@/lib/server/paths";

export function normalizeComparablePath(input: string): string {
  return path.resolve(expandHome(input)).replaceAll("\\", "/").replace(/\/+$/, "");
}

export function belongsToProjectRoot(
  cwd: string | undefined,
  projectRootPath: string | null | undefined
): boolean {
  if (!projectRootPath) return true;
  if (!cwd) return false;
  const normalizedProjectRoot = normalizeComparablePath(projectRootPath);
  const normalizedCwd = normalizeComparablePath(cwd);
  return normalizedCwd === normalizedProjectRoot || normalizedCwd.startsWith(`${normalizedProjectRoot}/`);
}
