export type WindsurfRecoverability = "ls_readable" | "partial" | "unavailable";

export function inferWindsurfRecoverability(params: {
  trajectoryReadable: boolean;
  trajectoryMissing: boolean;
  hasSidecarEvidence: boolean;
}): WindsurfRecoverability | undefined {
  const { trajectoryReadable, trajectoryMissing, hasSidecarEvidence } = params;

  if (trajectoryReadable) return "ls_readable";
  if (!trajectoryMissing) return undefined;
  return hasSidecarEvidence ? "partial" : "unavailable";
}
