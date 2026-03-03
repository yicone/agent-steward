import { describe, expect, it } from "vitest";

import { extractLatestAntigravityStartInfoFromLog } from "../src/lib/parse/antigravityLog";

describe("extractLatestAntigravityStartInfoFromLog", () => {
  it("extracts pid and random ports", () => {
    const text = `
I0303 15:42:04.369778  4669 server.go:1130] Starting language server process with pid 4669
I0303 15:42:04.373774  4669 server.go:468] Language server listening on random port at 65392 for HTTPS
I0303 15:42:04.373801  4669 server.go:475] Language server listening on random port at 65393 for HTTP
`;
    expect(extractLatestAntigravityStartInfoFromLog(text)).toEqual({ pid: 4669, httpPort: 65393, httpsPort: 65392 });
  });

  it("prefers ports after the last start", () => {
    const text = `
I0301 10:00:00.000000  1000 server.go:1130] Starting language server process with pid 1000
I0301 10:00:00.000000  1000 server.go:468] Language server listening on fixed port at 50000 for HTTPS
I0301 10:00:00.000000  1000 server.go:475] Language server listening on fixed port at 50001 for HTTP
I0303 15:42:04.369778  4669 server.go:1130] Starting language server process with pid 4669
I0303 15:42:04.373774  4669 server.go:468] Language server listening on random port at 65392 for HTTPS
I0303 15:42:04.373801  4669 server.go:475] Language server listening on random port at 65393 for HTTP
`;
    expect(extractLatestAntigravityStartInfoFromLog(text)).toEqual({ pid: 4669, httpPort: 65393, httpsPort: 65392 });
  });

  it("returns null when pid is missing", () => {
    expect(extractLatestAntigravityStartInfoFromLog("nope")).toBeNull();
  });
});

