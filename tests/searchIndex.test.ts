import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

// We create a fresh DB path per test by updating the env var and calling closeDb().
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "asm-search-test-"));
let testDbPath = path.join(tmpDir, "test-0.db");
process.env.AGENT_STORAGE_MANAGER_SEARCH_DB_PATH = testDbPath;

// Note: static `import` statements are hoisted by the module system and are
// evaluated before any top-level code in this file. This is fine because
// `searchIndex` reads `process.env.AGENT_STORAGE_MANAGER_SEARCH_DB_PATH`
// lazily inside `dbPath()` — which is only called when the database is first
// opened (on the initial `getDb()` call). As long as `resetDb()` sets the
// env var before any search function is invoked, the correct path is used.
import {
  closeDb,
  getIndexedSessionIds,
  indexSession,
  removeSession,
  searchSessions
} from "../src/lib/server/searchIndex";
import type { TrajectoryEvent } from "../src/lib/types";

let testCounter = 0;

/** Reset to a clean DB before each test. */
function resetDb() {
  closeDb();
  testCounter += 1;
  testDbPath = path.join(tmpDir, `test-${testCounter}.db`);
  process.env.AGENT_STORAGE_MANAGER_SEARCH_DB_PATH = testDbPath;
}

function makeEvent(overrides: Partial<TrajectoryEvent> = {}): TrajectoryEvent {
  return {
    id: "evt-1",
    index: 0,
    source: "antigravity",
    kind: "user",
    stepType: "CORTEX_STEP_TYPE_USER_MESSAGE",
    title: "User Message",
    ...overrides
  };
}

describe("searchIndex", () => {
  beforeEach(() => resetDb());
  afterEach(() => closeDb());
  afterAll(() => {
    closeDb();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("indexSession / getIndexedSessionIds", () => {
    it("returns an empty index initially", () => {
      expect(getIndexedSessionIds()).toHaveLength(0);
    });

    it("indexes a session and returns it in getIndexedSessionIds", () => {
      indexSession("sess-1", "antigravity", "My first session", "/home/user/project", [
        makeEvent({ text: "Hello world" })
      ]);
      const ids = getIndexedSessionIds();
      expect(ids).toHaveLength(1);
      expect(ids[0]).toMatchObject({ sessionId: "sess-1", source: "antigravity" });
    });

    it("is idempotent — re-indexing the same session does not create duplicates", () => {
      indexSession("sess-2", "windsurf", "My session", "/cwd", [makeEvent()]);
      indexSession("sess-2", "windsurf", "My session updated", "/cwd", [makeEvent()]);
      const ids = getIndexedSessionIds();
      expect(ids.filter((x) => x.sessionId === "sess-2")).toHaveLength(1);
    });

    it("indexes multiple sessions from different sources independently", () => {
      indexSession("sess-a", "antigravity", "AG session", "/a", [makeEvent()]);
      indexSession("sess-a", "windsurf", "WS session", "/a", [makeEvent()]);
      const ids = getIndexedSessionIds();
      expect(ids).toHaveLength(2);
    });
  });

  describe("removeSession", () => {
    it("removes an indexed session", () => {
      indexSession("sess-del", "antigravity", "To delete", "/cwd", [makeEvent()]);
      expect(getIndexedSessionIds()).toHaveLength(1);
      removeSession("sess-del", "antigravity");
      expect(getIndexedSessionIds()).toHaveLength(0);
    });

    it("is a no-op for non-existent sessions", () => {
      expect(() => removeSession("does-not-exist", "antigravity")).not.toThrow();
    });
  });

  describe("searchSessions — FTS5 path (query.length >= 3)", () => {
    beforeEach(() => {
      indexSession("sess-hello", "antigravity", "Hello World Session", "/projects/hello", [
        makeEvent({ text: "This is a greeting message about hello world" }),
        makeEvent({ id: "evt-2", commandLine: "echo hello", output: "hello\n" })
      ]);
      indexSession("sess-other", "windsurf", "Another Session", "/projects/other", [
        makeEvent({ text: "Completely unrelated content about databases" })
      ]);
    });

    it("finds a session by title keyword", () => {
      const results = searchSessions("Hello World");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-hello");
    });

    it("finds a session by event text content", () => {
      const results = searchSessions("greeting");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-hello");
    });

    it("finds a session by commandLine content", () => {
      const results = searchSessions("echo");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-hello");
    });

    it("returns a non-empty snippet for matched content", () => {
      const results = searchSessions("databases");
      expect(results).toHaveLength(1);
      expect(results[0]!.snippet).toBeTruthy();
    });

    it("returns no results for unknown query", () => {
      const results = searchSessions("zzznomatch999");
      expect(results).toHaveLength(0);
    });

    it("is case-insensitive", () => {
      const lower = searchSessions("hello world");
      const upper = searchSessions("HELLO WORLD");
      expect(lower.length).toBeGreaterThan(0);
      expect(upper.length).toBeGreaterThan(0);
    });

    it("respects the limit parameter", () => {
      // Index 5 more sessions with "foo" in their content
      for (let i = 0; i < 5; i++) {
        indexSession(`sess-foo-${i}`, "antigravity", `Foo Session ${i}`, "/cwd", [
          makeEvent({ text: "foo bar baz" })
        ]);
      }
      const results = searchSessions("foo", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("searchSessions — CJK 3+ char trigram", () => {
    beforeEach(() => {
      indexSession("sess-zh", "antigravity", "中文会话管理", "/projects/zh", [
        makeEvent({ text: "这是一个关于命令行工具的会话，用于管理 AI 代理的存储。" })
      ]);
    });

    it("finds session by 3-char CJK phrase in title", () => {
      const results = searchSessions("会话管");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-zh");
    });

    it("finds session by 3-char CJK phrase in event text", () => {
      const results = searchSessions("命令行");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-zh");
    });
  });

  describe("searchSessions — LIKE fallback (query.length < 3)", () => {
    beforeEach(() => {
      indexSession("sess-like", "antigravity", "会话搜索", "/projects/search", [
        makeEvent({ text: "测试" })
      ]);
    });

    it("finds a session by 2-char CJK title via LIKE fallback", () => {
      const results = searchSessions("会话");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-like");
    });

    it("finds a session by 2-char CJK cwd fragment via LIKE fallback", () => {
      indexSession("sess-cwd", "windsurf", "Unrelated Title", "/my/工具/path", [makeEvent()]);
      const results = searchSessions("工具");
      expect(results.some((r) => r.sessionId === "sess-cwd")).toBe(true);
    });

    it("returns empty for empty query", () => {
      expect(searchSessions("")).toHaveLength(0);
      expect(searchSessions("  ")).toHaveLength(0);
    });
  });

  describe("searchSessions — FTS5 query escaping (special characters)", () => {
    beforeEach(() => {
      indexSession("sess-special", "antigravity", 'foo"bar baz', "/home/user/project", [
        makeEvent({ text: "contains colon like a:b and dash -hello and star *wild* and flag --watch" })
      ]);
    });

    it("handles a query with double-quotes without throwing", () => {
      expect(() => searchSessions('foo"bar')).not.toThrow();
    });

    it("handles a query with colon without throwing", () => {
      expect(() => searchSessions("a:b")).not.toThrow();
    });

    it("handles a query with leading hyphen without throwing", () => {
      expect(() => searchSessions("-hello")).not.toThrow();
    });

    it("handles a query with asterisk without throwing", () => {
      expect(() => searchSessions("*wild*")).not.toThrow();
    });

    it("handles a query with filesystem path slash without throwing", () => {
      expect(() => searchSessions("/home/user")).not.toThrow();
    });

    it("handles a query with double-dash flag without throwing", () => {
      expect(() => searchSessions("--watch")).not.toThrow();
    });

    it("returns results for a query that contains double-quotes", () => {
      // The session title contains foo"bar — an exact match should be found.
      const results = searchSessions('foo"bar');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]!.sessionId).toBe("sess-special");
    });
  });
});
