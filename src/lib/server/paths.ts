import "server-only";

import os from "node:os";

export function expandHome(p: string): string {
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return `${os.homedir()}/${p.slice(2)}`;
  return p;
}

