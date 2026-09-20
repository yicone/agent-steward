import ProjectShellClient from "@/components/ProjectShellClient";
import { getProjectShellContext } from "@/lib/server/projectShellContext";
import { deriveInitialProjectShellPage } from "@/lib/projectShellNavigation";

export const dynamic = "force-dynamic";

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const projectShellContext = getProjectShellContext();
  return <ProjectShellClient {...projectShellContext} initialPage={deriveInitialProjectShellPage(searchParams)} />;
}
