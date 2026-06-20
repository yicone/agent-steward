import "server-only";

import { dedupeShellProjects, type ShellProject } from "@/lib/projectShellProjects";
import { getProjectEvidenceProviderResult } from "@/lib/server/projectEvidenceProvider";
import type { ProjectEvidenceProviderResult } from "@/lib/projectEvidenceProvider";

export type ProjectShellContext = {
  projects: ShellProject[];
  initialActiveProjectKey: string;
  projectEvidenceByProjectKey: Record<string, ProjectEvidenceProviderResult>;
};

function readConfiguredProjectRoots(): string[] {
  const raw = process.env.AGENT_STEWARD_PROJECT_ROOTS;
  if (!raw?.trim()) return [];
  return raw
    .split(pathListSeparator())
    .map((item) => item.trim())
    .filter(Boolean);
}

function pathListSeparator(): string {
  return process.platform === "win32" ? ";" : ":";
}

export function getProjectShellContext(defaultRootDir = process.cwd()): ProjectShellContext {
  const rootPaths = [defaultRootDir, ...readConfiguredProjectRoots()].filter(Boolean);
  const projects = dedupeShellProjects(rootPaths);
  const projectEvidenceByProjectKey = Object.fromEntries(
    projects.map((project) => [project.projectKey, getProjectEvidenceProviderResult(project.rootPath)])
  );
  const initialActiveProjectKey = projects[0]?.projectKey ?? "";

  return {
    projects,
    initialActiveProjectKey,
    projectEvidenceByProjectKey,
  };
}
