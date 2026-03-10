export type CsrfTokenSource = "ps_args" | "override" | "discovery_file" | "none";

export function classifyCsrfTokenSource(params: {
  tokenFromPs?: string | null;
  overrideToken?: string | null;
  discoveryToken?: string | null;
}): { token: string | null; source: CsrfTokenSource } {
  const tokenFromPs = params.tokenFromPs?.trim() || "";
  const overrideToken = params.overrideToken?.trim() || "";
  const discoveryToken = params.discoveryToken?.trim() || "";

  if (tokenFromPs) return { token: tokenFromPs, source: "ps_args" };
  if (overrideToken) return { token: overrideToken, source: "override" };
  if (discoveryToken) return { token: discoveryToken, source: "discovery_file" };
  return { token: null, source: "none" };
}
