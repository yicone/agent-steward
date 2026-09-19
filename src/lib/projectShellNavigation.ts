import type { ProjectShellPage } from "@/components/ProjectShellClient";

export function deriveInitialProjectShellPage(searchParams?: Record<string, string | string[] | undefined>): ProjectShellPage {
  return searchParams?.workItemId
    ? "work"
    : searchParams?.continue
      ? "continue"
      : searchParams?.id || searchParams?.source
        ? "sessions"
        : "continue";
}
