import { describe, expect, it } from "vitest";

import { extractLatestWindsurfStartInfoFromLog } from "../src/lib/parse/windsurfLog";

describe("extractLatestWindsurfStartInfoFromLog", () => {
  it("parses the latest pid/port pair", () => {
    const text = `
I main.go:819] Starting language server process with pid 12731
I server.go:366] Language server listening on random port at 51001
... other logs ...
I main.go:819] Starting language server process with pid 18800
I server.go:366] Language server listening on random port at 58690
`;
    expect(extractLatestWindsurfStartInfoFromLog(text)).toEqual({ pid: 18800, port: 58690 });
  });
});
