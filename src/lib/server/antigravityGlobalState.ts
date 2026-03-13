import "server-only";

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";

import type { ConversationMeta } from "@/lib/types";
import { expandHome } from "@/lib/server/paths";
import { platformPaths } from "@/lib/server/platform";
import { abbreviateHome, fileUriToPath } from "@/lib/server/trajectoryMeta";

const execFileAsync = promisify(execFile);

const TRAJECTORY_SUMMARIES_KEYS = [
  "antigravityUnifiedStateSync.trajectorySummaries",
  "unifiedStateSync.trajectorySummaries"
] as const;

let _defaultVscdbPath: string | undefined;

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    return Uint8Array.from(Buffer.from(b64.trim(), "base64"));
  } catch {
    return null;
  }
}

function bytesToUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function readVarint(buf: Uint8Array, offset: number): { value: number; offset: number } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < buf.length) {
    const b = buf[i]!;
    i += 1;
    value |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value, offset: i };
    shift += 7;
    if (shift > 53) return null;
  }
  return null;
}

function readLengthDelimited(buf: Uint8Array, offset: number): { bytes: Uint8Array; offset: number } | null {
  const lenRes = readVarint(buf, offset);
  if (!lenRes) return null;
  const len = lenRes.value;
  const start = lenRes.offset;
  const end = start + len;
  if (end > buf.length) return null;
  return { bytes: buf.subarray(start, end), offset: end };
}

function skipField(
  buf: Uint8Array,
  offset: number,
  wireType: number
): { offset: number } | null {
  if (wireType === 0) {
    const v = readVarint(buf, offset);
    return v ? { offset: v.offset } : null;
  }
  if (wireType === 1) {
    const end = offset + 8;
    return end <= buf.length ? { offset: end } : null;
  }
  if (wireType === 2) {
    const ld = readLengthDelimited(buf, offset);
    return ld ? { offset: ld.offset } : null;
  }
  if (wireType === 5) {
    const end = offset + 4;
    return end <= buf.length ? { offset: end } : null;
  }
  return null;
}

function* iterAllUtf8StringsInProto(
  buf: Uint8Array,
  maxDepth: number,
  depth = 0
): Generator<string> {
  if (depth > maxDepth) return;
  let offset = 0;
  while (offset < buf.length) {
    const tagRes = readVarint(buf, offset);
    if (!tagRes) return;
    offset = tagRes.offset;
    const wireType = tagRes.value & 0x7;
    if (wireType !== 2) {
      const skipped = skipField(buf, offset, wireType);
      if (!skipped) return;
      offset = skipped.offset;
      continue;
    }

    const ld = readLengthDelimited(buf, offset);
    if (!ld) return;
    offset = ld.offset;

    const asString = bytesToUtf8(ld.bytes);
    if (asString !== null) yield asString;
    yield* iterAllUtf8StringsInProto(ld.bytes, maxDepth, depth + 1);
  }
}

export function extractMetaFromCascadeTrajectorySummaryProtoBytes(summaryProtoBytes: Uint8Array): ConversationMeta {
  // title: field 1 string (stable across versions we observed)
  let title: string | undefined;
  if (summaryProtoBytes.length >= 2 && summaryProtoBytes[0] === 0x0a) {
    const ld = readLengthDelimited(summaryProtoBytes, 1);
    if (ld) {
      const s = bytesToUtf8(ld.bytes);
      if (s && s.trim().length) title = s.trim();
    }
  }

  // cwd: find first file uri anywhere in the message (nested included)
  let cwd: string | undefined;
  for (const s of iterAllUtf8StringsInProto(summaryProtoBytes, 6)) {
    const m = s.match(/#?file:\/\/[^\s\x00-\x1f"]+/);
    if (!m) continue;
    let uri = m[0];
    if (uri.startsWith("#")) uri = uri.slice(1);
    const p = fileUriToPath(uri);
    if (!p) continue;
    cwd = abbreviateHome(p);
    break;
  }

  return { ...(title ? { title } : {}), ...(cwd ? { cwd } : {}) };
}

export function buildMetaMapFromGlobalStateTrajectorySummariesValue(
  outerValueBase64: string
): Record<string, ConversationMeta> {
  const outerBytes = base64ToBytes(outerValueBase64);
  if (!outerBytes) return {};

  const out: Record<string, ConversationMeta> = {};
  let offset = 0;

  while (offset < outerBytes.length) {
    const tagRes = readVarint(outerBytes, offset);
    if (!tagRes) break;
    offset = tagRes.offset;

    const fieldNumber = tagRes.value >>> 3;
    const wireType = tagRes.value & 0x7;

    if (fieldNumber !== 1 || wireType !== 2) {
      const skipped = skipField(outerBytes, offset, wireType);
      if (!skipped) break;
      offset = skipped.offset;
      continue;
    }

    const entryLd = readLengthDelimited(outerBytes, offset);
    if (!entryLd) break;
    offset = entryLd.offset;

    let entryKey: string | null = null;
    let innerSummaryB64: string | null = null;

    let entryOffset = 0;
    const entryBytes = entryLd.bytes;
    while (entryOffset < entryBytes.length) {
      const t = readVarint(entryBytes, entryOffset);
      if (!t) break;
      entryOffset = t.offset;
      const f = t.value >>> 3;
      const w = t.value & 0x7;

      if (f === 1 && w === 2) {
        const keyLd = readLengthDelimited(entryBytes, entryOffset);
        if (!keyLd) break;
        entryOffset = keyLd.offset;
        entryKey = bytesToUtf8(keyLd.bytes);
        continue;
      }

      if (f === 2 && w === 2) {
        const valLd = readLengthDelimited(entryBytes, entryOffset);
        if (!valLd) break;
        entryOffset = valLd.offset;

        // value message: field 1 is the base64 string of CascadeTrajectorySummary proto bytes
        let valOffset = 0;
        while (valOffset < valLd.bytes.length) {
          const vt = readVarint(valLd.bytes, valOffset);
          if (!vt) break;
          valOffset = vt.offset;
          const vf = vt.value >>> 3;
          const vw = vt.value & 0x7;
          if (vf === 1 && vw === 2) {
            const innerLd = readLengthDelimited(valLd.bytes, valOffset);
            if (!innerLd) break;
            valOffset = innerLd.offset;
            innerSummaryB64 = bytesToUtf8(innerLd.bytes);
            break;
          }
          const skipped = skipField(valLd.bytes, valOffset, vw);
          if (!skipped) break;
          valOffset = skipped.offset;
        }

        continue;
      }

      const skipped = skipField(entryBytes, entryOffset, w);
      if (!skipped) break;
      entryOffset = skipped.offset;
    }

    if (!entryKey || !innerSummaryB64) continue;
    const summaryProtoBytes = base64ToBytes(innerSummaryB64);
    if (!summaryProtoBytes) continue;
    out[entryKey] = extractMetaFromCascadeTrajectorySummaryProtoBytes(summaryProtoBytes);
  }

  return out;
}

async function readVscdbValue(dbPath: string, key: string, sqlite3: string): Promise<string | null> {
  const safeKey = key.replaceAll("'", "''");
  try {
    const { stdout } = await execFileAsync(
      sqlite3,
      [dbPath, `select value from ItemTable where key='${safeKey}';`],
      { maxBuffer: 15 * 1024 * 1024 }
    );
    const v = (stdout ?? "").trim();
    return v.length ? v : null;
  } catch {
    return null;
  }
}

export async function getAntigravityTrajectoryMetaMapFromVscdb(params?: {
  vscdbPath?: string;
}): Promise<Record<string, ConversationMeta>> {
  const sqlite3 = platformPaths.sqlite3Binary();
  if (!sqlite3) return {};

  const vscdbPath = expandHome(params?.vscdbPath ?? (_defaultVscdbPath ??= platformPaths.antigravityVscdbPath()));
  try {
    await fs.stat(vscdbPath);
  } catch {
    return {};
  }

  for (const key of TRAJECTORY_SUMMARIES_KEYS) {
    const b64 = await readVscdbValue(vscdbPath, key, sqlite3);
    if (!b64) continue;
    const map = buildMetaMapFromGlobalStateTrajectorySummariesValue(b64);
    if (Object.keys(map).length) return map;
  }

  return {};
}
