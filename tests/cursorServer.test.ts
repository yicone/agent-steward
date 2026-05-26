import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getCursorConversation, getCursorStatus, getCursorTrajectoryMetaMap, listCursorConversationFiles } from "../src/lib/server/cursor";
import type { AppConfig, RootConfig } from "../src/lib/types";

let tmpDir: string;

function createCursorFixture(rootDir: string) {
  const userDir = path.join(rootDir, "CursorUser");
  const globalStorageDir = path.join(userDir, "globalStorage");
  const workspaceStorageDir = path.join(userDir, "workspaceStorage", "workspace-1");
  return { userDir, globalStorageDir, workspaceStorageDir };
}

async function seedCursorFixture(rootDir: string) {
  const fixture = createCursorFixture(rootDir);
  await fs.mkdir(fixture.globalStorageDir, { recursive: true });
  await fs.mkdir(fixture.workspaceStorageDir, { recursive: true });
  await fs.writeFile(
    path.join(fixture.workspaceStorageDir, "workspace.json"),
    JSON.stringify({ folder: "file:///Users/test/example-repo" }, null, 2),
    "utf-8"
  );

  const globalDb = new Database(path.join(fixture.globalStorageDir, "state.vscdb"));
  globalDb.exec("CREATE TABLE cursorDiskKV (key TEXT, value BLOB);");
  globalDb.prepare("INSERT INTO cursorDiskKV (key, value) VALUES (?, ?)").run(
    "composerData:test-composer-1",
    JSON.stringify({
      _v: 15,
      composerId: "test-composer-1",
      name: "Cursor support implementation",
      subtitle: "Edited src/lib/server/cursor.ts",
      status: "completed",
      createdAt: 1752000000000,
      lastUpdatedAt: 1752000100000,
      latestConversationSummary: {
        summary: {
          summary: "Implemented the bounded Cursor adapter using local SQLite/app-storage facts."
        }
      },
      todos: [
        { text: "Verify workspace mapping", done: true, status: "done" },
        { text: "Document bounded transcript support", done: false, status: "open" }
      ],
      context: {
        cursorRules: [{ filename: "always.mdc", addedWithoutMention: true }],
        fileSelections: [{ uri: { external: "file:///Users/test/example-repo/src/index.ts" } }],
        externalLinks: ["https://example.com/docs"]
      },
      fullConversationHeadersOnly: [
        { bubbleId: "user-1", type: 1 },
        { bubbleId: "assistant-1", type: 2 }
      ],
      conversationMap: {}
    })
  );
  globalDb.close();

  const workspaceDb = new Database(path.join(fixture.workspaceStorageDir, "state.vscdb"));
  workspaceDb.exec("CREATE TABLE ItemTable (key TEXT, value BLOB);");
  workspaceDb.prepare("INSERT INTO ItemTable (key, value) VALUES (?, ?)").run(
    "composer.composerData",
    JSON.stringify({
      selectedComposerIds: ["test-composer-1"],
      lastFocusedComposerIds: ["test-composer-1"]
    })
  );
  workspaceDb.close();

  return fixture.userDir;
}

function buildConfig(cursorRoot: string): AppConfig {
  const roots: RootConfig[] = [
    { id: "cursor-root", source: "cursor", path: cursorRoot, enabled: true }
  ];
  return {
    schemaVersion: 1,
    roots,
    windsurf: {},
    ui: {
      defaultSource: "cursor",
      sortOrder: "mtime_desc"
    }
  };
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-cursor-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("cursor server adapter", () => {
  it("lists composer sessions from Cursor local state", async () => {
    const cursorRoot = await seedCursorFixture(tmpDir);
    const items = await listCursorConversationFiles({
      id: "cursor-root",
      source: "cursor",
      path: cursorRoot,
      enabled: true
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("test-composer-1");
    expect(items[0]?.path).toContain("composerData:test-composer-1");
  });

  it("builds a Cursor metadata map with inferred workspace path", async () => {
    const cursorRoot = await seedCursorFixture(tmpDir);
    const meta = await getCursorTrajectoryMetaMap(buildConfig(cursorRoot));

    expect(meta["test-composer-1"]).toEqual({
      title: "Cursor support implementation",
      cwd: "/Users/test/example-repo"
    });
  });

  it("renders bounded markdown and synthetic events for a Cursor session", async () => {
    const cursorRoot = await seedCursorFixture(tmpDir);
    const conversation = await getCursorConversation("test-composer-1", buildConfig(cursorRoot));

    expect(conversation.markdown).toContain("# Cursor support implementation");
    expect(conversation.markdown).toContain("Conversation summary");
    expect(conversation.markdown).toContain("Retrieval note");
    expect(conversation.events.some((event: { stepType?: string }) => event.stepType === "cursor.summary")).toBe(true);
    expect(conversation.summary.totalSteps).toBeGreaterThan(0);
    expect(conversation.workspacePath).toBe("/Users/test/example-repo");
  });

  it("reports sessionsFound status from validated Cursor local storage", async () => {
    const cursorRoot = await seedCursorFixture(tmpDir);
    const status = await getCursorStatus(buildConfig(cursorRoot));

    expect(status.sessionsFound).toBe(true);
    expect(status.sessionCount).toBe(1);
    expect(status.storagePath).toContain("state.vscdb");
  });
});
