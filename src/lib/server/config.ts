import "server-only";

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { AppConfig, RootConfig, Source } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";

const DEFAULT_CONFIG_DIR = path.join(os.homedir(), ".agent-storage-manager");
const DEFAULT_CONFIG_PATH = path.join(DEFAULT_CONFIG_DIR, "config.json");

function getConfigPath(): string {
  const override = process.env.AGENT_STORAGE_MANAGER_CONFIG_PATH;
  if (override && override.trim().length) return expandHome(override.trim());
  return DEFAULT_CONFIG_PATH;
}

function defaultRoots(): RootConfig[] {
  return [
    {
      id: "antigravity-default",
      source: "antigravity",
      path: "~/.gemini/antigravity/conversations",
      enabled: true
    },
    {
      id: "windsurf-default",
      source: "windsurf",
      path: "~/.codeium/windsurf/cascade",
      enabled: true
    },
    {
      id: "codex-default",
      source: "codex",
      path: "~/.codex/sessions",
      enabled: true
    }
  ];
}

export function defaultConfig(): AppConfig {
  return {
    schemaVersion: 1,
    roots: defaultRoots(),
    windsurf: {},
    ui: {
      defaultSource: "antigravity",
      sortOrder: "mtime_desc"
    }
  };
}

function isSource(value: unknown): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex";
}

function sanitizeRoots(roots: unknown): RootConfig[] {
  if (!Array.isArray(roots)) return defaultRoots();
  const out: RootConfig[] = [];
  for (const root of roots) {
    if (!root || typeof root !== "object") continue;
    const r = root as any;
    if (!isSource(r.source)) continue;
    const id = typeof r.id === "string" && r.id.trim().length ? r.id.trim() : crypto.randomUUID();
    const p = typeof r.path === "string" && r.path.trim().length ? r.path.trim() : "";
    if (!p) continue;
    out.push({
      id,
      source: r.source,
      path: p,
      enabled: Boolean(r.enabled)
    });
  }
  if (!out.length) return defaultRoots();

  // Backfill default roots for any source not represented in the saved config.
  // This ensures users who saved their config before a new source was introduced
  // (e.g. Codex) automatically get the default root for that source injected.
  const presentSources = new Set(out.map((r) => r.source));
  for (const def of defaultRoots()) {
    if (!presentSources.has(def.source)) {
      out.push(def);
    }
  }

  return out;
}

function sanitizeConfig(input: unknown): AppConfig {
  const def = defaultConfig();
  if (!input || typeof input !== "object") return def;
  const cfg = input as any;

  const roots = sanitizeRoots(cfg.roots);
  const defaultSource: Source = isSource(cfg?.ui?.defaultSource) ? cfg.ui.defaultSource : def.ui.defaultSource;
  const csrfTokenOverride =
    typeof cfg?.windsurf?.csrfTokenOverride === "string" && cfg.windsurf.csrfTokenOverride.trim().length
      ? cfg.windsurf.csrfTokenOverride.trim()
      : undefined;

  return {
    schemaVersion: 1,
    roots,
    windsurf: {
      ...(csrfTokenOverride ? { csrfTokenOverride } : {})
    },
    ui: {
      defaultSource,
      sortOrder: "mtime_desc"
    }
  };
}

export async function readConfig(): Promise<{ path: string; config: AppConfig }> {
  const configPath = getConfigPath();
  try {
    const raw = await fs.readFile(configPath, "utf-8");
    return { path: configPath, config: sanitizeConfig(JSON.parse(raw)) };
  } catch {
    const cfg = defaultConfig();
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(cfg, null, 2), "utf-8");
    return { path: configPath, config: cfg };
  }
}

export async function writeConfig(config: unknown): Promise<{ path: string; config: AppConfig }> {
  const configPath = getConfigPath();
  const sanitized = sanitizeConfig(config);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(sanitized, null, 2), "utf-8");
  return { path: configPath, config: sanitized };
}

