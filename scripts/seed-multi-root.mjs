#!/usr/bin/env node

/**
 * seed-multi-root.mjs
 *
 * Creates synthetic multi-root test fixtures for local development.
 * Generates temporary directories with dummy .pb files, including
 * cross-root duplicates, and writes a config.json that the dev server
 * can use via AGENT_STORAGE_MANAGER_CONFIG_PATH.
 *
 * Usage:
 *   node scripts/seed-multi-root.mjs            # create fixtures + config
 *   node scripts/seed-multi-root.mjs --clean     # remove previously seeded data
 *
 * Then start the dev server pointing at the seeded config:
 *   AGENT_STORAGE_MANAGER_CONFIG_PATH=.local/seed-config.json pnpm dev
 */

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SEED_DIR = path.join(PROJECT_ROOT, ".local", "seed-roots");
const SEED_CONFIG = path.join(PROJECT_ROOT, ".local", "seed-config.json");

/* ---------- helpers ---------- */

function uuid() {
  return crypto.randomUUID();
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeDummyPb(dir, name) {
  // Write a small non-empty file so it has realistic size/mtime
  const content = `dummy-pb-${name}-${Date.now()}`;
  await fs.writeFile(path.join(dir, `${name}.pb`), content, "utf-8");
}

/* ---------- clean ---------- */

async function clean() {
  try {
    await fs.rm(SEED_DIR, { recursive: true, force: true });
    console.log(`✓ Removed ${SEED_DIR}`);
  } catch {
    console.log(`  (nothing to remove at ${SEED_DIR})`);
  }
  try {
    await fs.rm(SEED_CONFIG, { force: true });
    console.log(`✓ Removed ${SEED_CONFIG}`);
  } catch {
    console.log(`  (nothing to remove at ${SEED_CONFIG})`);
  }
}

/* ---------- seed ---------- */

async function seed() {
  console.log("Seeding multi-root test fixtures…\n");

  // Define roots
  const roots = [
    { id: "ag-primary", source: "antigravity", subdir: "ag-primary" },
    { id: "ag-backup", source: "antigravity", subdir: "ag-backup" },
    { id: "ag-empty", source: "antigravity", subdir: "ag-empty" },
    { id: "ws-primary", source: "windsurf", subdir: "ws-primary" },
    { id: "ws-external", source: "windsurf", subdir: "ws-external" },
  ];

  // Shared session IDs for duplicate testing
  const sharedAgId = uuid();
  const sharedWsId = uuid();

  for (const root of roots) {
    const dir = path.join(SEED_DIR, root.subdir);
    await ensureDir(dir);
  }

  // ag-primary: 5 unique sessions + 1 shared
  const agPrimaryDir = path.join(SEED_DIR, "ag-primary");
  for (let i = 0; i < 5; i++) {
    await writeDummyPb(agPrimaryDir, uuid());
  }
  await writeDummyPb(agPrimaryDir, sharedAgId);

  // ag-backup: 2 unique sessions + the same shared (= duplicate)
  const agBackupDir = path.join(SEED_DIR, "ag-backup");
  for (let i = 0; i < 2; i++) {
    await writeDummyPb(agBackupDir, uuid());
  }
  await writeDummyPb(agBackupDir, sharedAgId);

  // ag-empty: no files (tests the "healthy but 0 pb" indicator)

  // ws-primary: 4 unique sessions + 1 shared
  const wsPrimaryDir = path.join(SEED_DIR, "ws-primary");
  for (let i = 0; i < 4; i++) {
    await writeDummyPb(wsPrimaryDir, uuid());
  }
  await writeDummyPb(wsPrimaryDir, sharedWsId);

  // ws-external: 1 unique + the same shared (= duplicate)
  const wsExternalDir = path.join(SEED_DIR, "ws-external");
  await writeDummyPb(wsExternalDir, uuid());
  await writeDummyPb(wsExternalDir, sharedWsId);

  // Write config
  const config = {
    schemaVersion: 1,
    roots: roots.map((r) => ({
      id: r.id,
      source: r.source,
      path: path.join(SEED_DIR, r.subdir),
      enabled: true,
    })),
    windsurf: {},
    ui: { defaultSource: "antigravity", sortOrder: "mtime_desc" },
  };

  await ensureDir(path.dirname(SEED_CONFIG));
  await fs.writeFile(SEED_CONFIG, JSON.stringify(config, null, 2), "utf-8");

  // Summary
  console.log("Created roots:");
  for (const r of roots) {
    const dir = path.join(SEED_DIR, r.subdir);
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".pb"));
    console.log(`  ${r.source}/${r.subdir}: ${files.length} .pb files`);
  }
  console.log(`\nDuplicate Antigravity session: ${sharedAgId}`);
  console.log(`Duplicate Windsurf session:     ${sharedWsId}`);
  console.log(`\nConfig written to: ${SEED_CONFIG}`);
  console.log(`\n── To use with dev server ──`);
  console.log(`  AGENT_STORAGE_MANAGER_CONFIG_PATH=${path.relative(PROJECT_ROOT, SEED_CONFIG)} pnpm dev`);
  console.log(`\n── What to verify ──`);
  console.log(`  • Settings page: 5 roots with per-root health badges (pb counts)`);
  console.log(`  • Settings page: ag-empty shows "0 pb" (healthy but empty)`);
  console.log(`  • Conversations list (Antigravity): duplicate indicator on shared session`);
  console.log(`  • Conversations list (Windsurf): duplicate indicator on shared session`);
  console.log(`  • GET /api/root-health: all 5 roots report "healthy" status`);
  console.log(`\n── To clean up ──`);
  console.log(`  node scripts/seed-multi-root.mjs --clean`);
}

/* ---------- main ---------- */

const args = process.argv.slice(2);
if (args.includes("--clean")) {
  await clean();
} else {
  await seed();
}
