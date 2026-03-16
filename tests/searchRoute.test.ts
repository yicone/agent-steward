import { afterEach, describe, expect, it, vi } from "vitest";

const searchSessionsMock = vi.fn();

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
      { id: "a", source: "antigravity", title: "A" },
      { id: "c", source: "codex", title: "C" },
      { id: "w", source: "windsurf", title: "W" },
    ]);

    const req = new Request("http://localhost/api/search?q=session&source=codex");
    const res = await GET(req);
    const payload = await res.json();

    expect(searchSessionsMock).toHaveBeenCalledWith("session", 20);
    expect(payload.results).toEqual([{ id: "c", source: "codex", title: "C" }]);
  });

  it("returns empty results when q is blank", async () => {
    const req = new Request("http://localhost/api/search?q=   ");
    const res = await GET(req);
    const payload = await res.json();

    expect(payload).toEqual({ results: [] });
    expect(searchSessionsMock).not.toHaveBeenCalled();
  });
});
