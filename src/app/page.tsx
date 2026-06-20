import ProjectShellClient from "@/components/ProjectShellClient";
import { getProjectShellContext } from "@/lib/server/projectShellContext";

export const dynamic = "force-dynamic";

export default function Page() {
  const projectShellContext = getProjectShellContext();
  return <ProjectShellClient {...projectShellContext} />;
}
