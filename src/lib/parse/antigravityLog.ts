export type AntigravityStartInfo = {
  pid: number;
  httpPort?: number;
  httpsPort?: number;
};

export function extractLatestAntigravityStartInfoFromLog(text: string): AntigravityStartInfo | null {
  const pidRegex = /Starting language server process with pid\s+(\d+)/g;
  const httpPortRegex = /Language server listening on (?:random|fixed) port at\s+(\d+)\s+for HTTP\b/gi;
  const httpsPortRegex = /Language server listening on (?:random|fixed) port at\s+(\d+)\s+for HTTPS\b/gi;

  const starts: Array<{ index: number; pid: number }> = [];
  const httpPorts: Array<{ index: number; port: number }> = [];
  const httpsPorts: Array<{ index: number; port: number }> = [];

  for (const match of text.matchAll(pidRegex)) {
    starts.push({ index: match.index ?? 0, pid: Number(match[1]) });
  }
  for (const match of text.matchAll(httpPortRegex)) {
    httpPorts.push({ index: match.index ?? 0, port: Number(match[1]) });
  }
  for (const match of text.matchAll(httpsPortRegex)) {
    httpsPorts.push({ index: match.index ?? 0, port: Number(match[1]) });
  }

  if (starts.length === 0) return null;
  const lastStart = starts[starts.length - 1]!;

  const httpAfter = httpPorts.find((p) => p.index > lastStart.index) ?? httpPorts[httpPorts.length - 1];
  const httpsAfter = httpsPorts.find((p) => p.index > lastStart.index) ?? httpsPorts[httpsPorts.length - 1];

  const pid = lastStart.pid;
  if (!Number.isFinite(pid) || pid <= 0) return null;

  const httpPort = httpAfter && Number.isFinite(httpAfter.port) ? httpAfter.port : undefined;
  const httpsPort = httpsAfter && Number.isFinite(httpsAfter.port) ? httpsAfter.port : undefined;

  return { pid, ...(httpPort ? { httpPort } : {}), ...(httpsPort ? { httpsPort } : {}) };
}
