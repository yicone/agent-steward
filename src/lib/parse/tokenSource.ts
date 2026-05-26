export type CsrfTokenSource = "ps_args" | "ps_env" | "override" | "discovery_file" | "none";

export function classifyCsrfTokenSource(params: {
  tokenFromPs?: string | null;
  tokenFromPsSource?: "ps_args" | "ps_env" | "none";
  overrideToken?: string | null;
  discoveryToken?: string | null;
}): { token: string | null; source: CsrfTokenSource } {
  const tokenFromPs = params.tokenFromPs?.trim() || "";
  const tokenFromPsSource = params.tokenFromPsSource ?? "ps_args";
  const overrideToken = params.overrideToken?.trim() || "";
  const discoveryToken = params.discoveryToken?.trim() || "";

  if (tokenFromPs) return { token: tokenFromPs, source: tokenFromPsSource };
  if (overrideToken) return { token: overrideToken, source: "override" };
  if (discoveryToken) return { token: discoveryToken, source: "discovery_file" };
  return { token: null, source: "none" };
}
