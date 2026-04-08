import { afterEach, describe, expect, it, vi } from "vitest";

const searchSessionsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/searchIndex", () => ({
  searchSessions: (...args: unknown[]) => searchSessionsMock(...args),
}));

import { GET } from "@/app/api/search/route";

afterEach(() => {
  searchSessionsMock.mockReset();
});

describe("GET /api/search", () => {
  it("filters results when source=codex", async () => {
    searchSessionsMock.mockReturnValue([
      { sessionId: "a", source: "antigravity", title: "A", cwd: "/antigravity", snippet: "Antigravity session" },
      { sessionId: "c", source: "codex", title: "C", cwd: "/codex", snippet: "Codex session" },
      { sessionId: "w", source: "windsurf", title: "W", cwd: "/windsurf", snippet: "Windsurf session" },
    ]);

    const req = new Request("http://localhost/api/search?q=session&source=codex");
    const res = await GET(req);
    const payload = await res.json();

    expect(searchSessionsMock).toHaveBeenCalledWith("session", 20);
    expect(payload.results).toEqual([
      { sessionId: "c", source: "codex", title: "C", cwd: "/codex", snippet: "Codex session" },
    ]);
  });

  it("returns empty results when q is blank", async () => {
    const req = new Request("http://localhost/api/search?q=   ");
    const res = await GET(req);
    const payload = await res.json();

    expect(payload).toEqual({ results: [] });
    expect(searchSessionsMock).not.toHaveBeenCalled();
  });
});
