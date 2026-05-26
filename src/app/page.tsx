import ProjectShellClient from "@/components/ProjectShellClient";
import { getProjectEvidenceProviderResult } from "@/lib/server/projectEvidenceProvider";

export const dynamic = "force-dynamic";

export default function Page() {
  const projectEvidence = getProjectEvidenceProviderResult();
  return <ProjectShellClient projectEvidence={projectEvidence} />;
}
