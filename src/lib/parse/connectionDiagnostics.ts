export function getSessionRestartAction(params: {
  appName: "Antigravity" | "Windsurf";
  sessionName: "session" | "Cascade session";
  pidAlive: boolean;
}): string {
  const { appName, sessionName, pidAlive } = params;
  if (!pidAlive) return `Keep ${appName} open and start a ${sessionName} to relaunch the language server.`;
  return `Keep ${appName} running and start/restart a ${sessionName}, then refresh.`;
}

export function getHeartbeatFailureSummary(params: {
  appName: "Antigravity" | "Windsurf";
  csrfTokenPresent: boolean;
}): string {
  const { appName, csrfTokenPresent } = params;
  if (csrfTokenPresent) return `${appName} heartbeat probe failed with and without CSRF token.`;
  return `Missing ${appName} CSRF token and heartbeat probe failed without token.`;
}
