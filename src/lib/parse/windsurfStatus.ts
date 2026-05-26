export function inferWindsurfTokenRequired(params: {
  heartbeatOk: boolean;
  heartbeatWithoutToken: boolean;
  csrfTokenPresent: boolean;
}): boolean | undefined {
  const { heartbeatOk, heartbeatWithoutToken, csrfTokenPresent } = params;

  if (heartbeatOk) return !heartbeatWithoutToken;

  // Both probes failed: token present means unknown/possibly invalid; no token means token discovery/override likely failed.
  return csrfTokenPresent ? undefined : true;
}

export function getWindsurfRecommendedAction(params: {
  attached: boolean;
  tokenRequired: boolean | undefined;
}): string {
  const { attached, tokenRequired } = params;

  if (attached) return "Connection healthy.";
  if (tokenRequired === true) return "Set Windsurf CSRF token override in Settings if the live LS token cannot be read from the running process.";
  if (tokenRequired === false) return "Keep Windsurf open and start/restart a Cascade session, then refresh.";
  return "CSRF token may be invalid or expired. First try refreshing the override token in Settings; if that fails, restart a Cascade session.";
}
