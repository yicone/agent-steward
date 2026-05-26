import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readConfig } from "../src/lib/server/config";
import type { RootConfig } from "../src/lib/types";

let tmpDir: string;
const origEnv = process.env.AGENT_SWITCH_CONFIG_PATH;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "asm-config-test-"));
  process.env.AGENT_SWITCH_CONFIG_PATH = path.join(tmpDir, "config.json");
});

afterEach(async () => {
  if (origEnv === undefined) {
    delete process.env.AGENT_SWITCH_CONFIG_PATH;
  } else {
    process.env.AGENT_SWITCH_CONFIG_PATH = origEnv;
  }
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("readConfig / sanitizeRoots backfill", () => {
  it("returns default config (including codex root) when no config file exists", async () => {
    const { config } = await readConfig();
    const sources = config.roots.map((r: RootConfig) => r.source);
    expect(sources).toContain("codex");
    expect(sources).toContain("cursor");
    expect(sources).toContain("antigravity");
    expect(sources).toContain("windsurf");
  });

  it("backfills default codex and cursor roots when saved config is missing newer sources", async () => {
    const savedConfig = {
      schemaVersion: 1,
      roots: [
        { id: "antigravity-default", source: "antigravity", path: "~/.gemini/antigravity/conversations", enabled: true },
        { id: "windsurf-default", source: "windsurf", path: "~/.codeium/windsurf/cascade", enabled: true }
      ],
      windsurf: {},
      ui: { defaultSource: "antigravity", sortOrder: "mtime_desc" }
    };
    await fs.writeFile(
      path.join(tmpDir, "config.json"),
      JSON.stringify(savedConfig, null, 2),
      "utf-8"
    );

    const { config } = await readConfig();
    const codexRoots = config.roots.filter((r: RootConfig) => r.source === "codex");
    expect(codexRoots.length).toBeGreaterThan(0);
    expect(codexRoots[0]!.path).toBe("~/.codex/sessions");
    expect(codexRoots[0]!.enabled).toBe(true);
    const cursorRoots = config.roots.filter((r: RootConfig) => r.source === "cursor");
    expect(cursorRoots.length).toBeGreaterThan(0);
    expect(cursorRoots[0]!.path).toBe("~/Library/Application Support/Cursor/User");
    expect(cursorRoots[0]!.enabled).toBe(true);
    // Existing roots are preserved
    expect(config.roots.filter((r: RootConfig) => r.source === "antigravity").length).toBeGreaterThan(0);
    expect(config.roots.filter((r: RootConfig) => r.source === "windsurf").length).toBeGreaterThan(0);
  });

  it("does not duplicate codex root when it already exists in saved config", async () => {
    const savedConfig = {
      schemaVersion: 1,
      roots: [
        { id: "codex-default", source: "codex", path: "~/.codex/sessions", enabled: true },
        { id: "windsurf-default", source: "windsurf", path: "~/.codeium/windsurf/cascade", enabled: true }
      ],
      windsurf: {},
      ui: { defaultSource: "codex", sortOrder: "mtime_desc" }
    };
    await fs.writeFile(
      path.join(tmpDir, "config.json"),
      JSON.stringify(savedConfig, null, 2),
      "utf-8"
    );

    const { config } = await readConfig();
    const codexRoots = config.roots.filter((r: RootConfig) => r.source === "codex");
    expect(codexRoots.length).toBe(1);
  });
});
