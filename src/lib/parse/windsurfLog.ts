export type WindsurfStartInfo = {
  pid: number;
  port: number;
};

export function extractLatestWindsurfStartInfoFromLog(text: string): WindsurfStartInfo | null {
  const pidRegex = /Starting language server process with pid (\d+)/g;
  const portRegex = /listening on random port at (\d+)/g;

  const starts: Array<{ index: number; pid: number }> = [];
  const ports: Array<{ index: number; port: number }> = [];

  for (const match of text.matchAll(pidRegex)) {
    starts.push({ index: match.index ?? 0, pid: Number(match[1]) });
  }
  for (const match of text.matchAll(portRegex)) {
    ports.push({ index: match.index ?? 0, port: Number(match[1]) });
  }

  if (starts.length === 0 || ports.length === 0) return null;

  // Pick the latest "start" and the first port message that appears after it.
  const lastStart = starts[starts.length - 1];
  const portAfter = ports.find((p) => p.index > lastStart.index) ?? ports[ports.length - 1];
  if (!Number.isFinite(lastStart.pid) || !Number.isFinite(portAfter.port)) return null;

  return { pid: lastStart.pid, port: portAfter.port };
}

