import path from "node:path";

export type ProjectKey = string;

export type ShellProject = {
  projectKey: ProjectKey;
  projectName: string;
  boundaryCue: string;
  rootPath: string;
};

export function normalizeProjectRootIdentity(rootPath: string): string {
  const resolved = path.resolve(rootPath);
  const normalized = resolved.replaceAll("\\", "/").replace(/\/+$|^$/g, "");
  return normalized || "/";
}

export function buildProjectKey(rootPath: string): ProjectKey {
  return normalizeProjectRootIdentity(rootPath);
}

export function buildShellProject(rootPath: string): ShellProject {
  const normalizedRootPath = normalizeProjectRootIdentity(rootPath);
  return {
    projectKey: buildProjectKey(normalizedRootPath),
    projectName: path.basename(normalizedRootPath) || normalizedRootPath,
    boundaryCue: normalizedRootPath,
    rootPath: normalizedRootPath,
  };
}

export function dedupeShellProjects(rootPaths: string[]): ShellProject[] {
  const seen = new Set<ProjectKey>();
  const projects: ShellProject[] = [];

  for (const rootPath of rootPaths) {
    const project = buildShellProject(rootPath);
    if (seen.has(project.projectKey)) continue;
    seen.add(project.projectKey);
    projects.push(project);
  }

  return projects;
}
