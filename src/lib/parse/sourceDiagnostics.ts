import type { SourcesStatus } from "@/lib/types";

export function formatSourceDiagnostics(status: SourcesStatus): string {
  const ag = status.antigravity;
  const ws = status.windsurf;
  const cx = status.codex;
  const cur = status.cursor ?? { sessionsFound: false };
  return [
    "Antigravity",
    `- discovered: ${ag.discovered}`,
    `- attachMethod: ${ag.attachMethod ?? "unknown"}`,
    `- path: ${ag.discoveryPath ?? "n/a"}`,
    `- pid: ${ag.pid ?? "n/a"} (alive=${ag.pidAlive ?? false})`,
    `- ports: http=${ag.httpPort ?? "n/a"}, https=${ag.httpsPort ?? "n/a"}`,
    `- csrf: present=${ag.csrfTokenPresent ?? false}, source=${ag.csrfTokenSource ?? "none"}, required=${ag.tokenRequired ?? "unknown"}`,
    `- heartbeatOk: ${ag.heartbeatOk ?? "unknown"}`,
    `- lastError: ${ag.lastError ?? "none"}`,
    `- recommendedAction: ${ag.recommendedAction ?? "none"}`,
    "",
    "Windsurf",
    `- attached: ${ws.attached}`,
    `- attachMethod: ${ws.attachMethod ?? "unknown"}`,
    `- path: ${ws.logPath ?? "n/a"}`,
    `- pid: ${ws.pid ?? "n/a"} (alive=${ws.pidAlive ?? false})`,
    `- port: ${ws.port ?? "n/a"}`,
    `- csrf: present=${ws.csrfTokenPresent ?? false}, source=${ws.csrfTokenSource ?? "none"}, required=${ws.tokenRequired ?? "unknown"}`,
    `- heartbeatOk: ${ws.heartbeatOk ?? "unknown"}`,
    `- lastError: ${ws.lastError ?? "none"}`,
    `- recommendedAction: ${ws.recommendedAction ?? "none"}`,
    "",
    "Codex",
    `- sessionsFound: ${cx.sessionsFound}`,
    `- sessionsDir: ${cx.sessionsDir ?? "n/a"}`,
    `- error: ${cx.error ?? "none"}`,
    "",
    "Cursor",
    `- sessionsFound: ${cur.sessionsFound}`,
    `- storagePath: ${cur.storagePath ?? "n/a"}`,
    `- sessionCount: ${cur.sessionCount ?? "n/a"}`,
    `- error: ${cur.error ?? "none"}`,
    `- recommendedAction: ${cur.recommendedAction ?? "none"}`
  ].join("\n");
}
