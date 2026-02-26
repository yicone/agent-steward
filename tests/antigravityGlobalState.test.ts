import os from "node:os";

import { describe, expect, it, vi } from "vitest";

import { buildMetaMapFromGlobalStateTrajectorySummariesValue } from "../src/lib/server/antigravityGlobalState";

function encodeVarint(value: number): Buffer {
  const out: number[] = [];
  let v = value >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
  return Buffer.from(out);
}

function encodeTag(fieldNumber: number, wireType: number): Buffer {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeBytesField(fieldNumber: number, bytes: Buffer): Buffer {
  return Buffer.concat([encodeTag(fieldNumber, 2), encodeVarint(bytes.length), bytes]);
}

function encodeStringField(fieldNumber: number, value: string): Buffer {
  return encodeBytesField(fieldNumber, Buffer.from(value, "utf8"));
}

function buildTrajectorySummaryProto(params: { title: string; cwdUri: string }): Buffer {
  // This is a minimal, schema-less proto payload:
  // - field 1 (string): title (observed as the summary/title in Antigravity)
  // - field 10 (string): a nested string containing '#file://...' (observed in real data)
  return Buffer.concat([encodeStringField(1, params.title), encodeStringField(10, params.cwdUri)]);
}

function buildGlobalStateOuterValueBase64(entries: Array<{ id: string; summaryProto: Buffer }>): string {
  const outerChunks: Buffer[] = [];
  for (const e of entries) {
    const innerSummaryB64 = e.summaryProto.toString("base64");
    const valueMsg = encodeStringField(1, innerSummaryB64);
    const entryMsg = Buffer.concat([encodeStringField(1, e.id), encodeBytesField(2, valueMsg)]);
    outerChunks.push(encodeBytesField(1, entryMsg));
  }
  const outer = Buffer.concat(outerChunks);
  return outer.toString("base64");
}

describe("buildMetaMapFromGlobalStateTrajectorySummariesValue", () => {
  it("extracts title and cwd from Antigravity global state payload", () => {
    const homedir = vi.spyOn(os, "homedir").mockReturnValue("/Users/test");
    try {
      const outerB64 = buildGlobalStateOuterValueBase64([
        {
          id: "646708a0-b67a-403a-b9be-5de183cb9913",
          summaryProto: buildTrajectorySummaryProto({
            title: "Fixing App Deletion Bug",
            cwdUri: "#file:///Users/test/Workspace/clipvibe"
          })
        }
      ]);

      const map = buildMetaMapFromGlobalStateTrajectorySummariesValue(outerB64);
      expect(map["646708a0-b67a-403a-b9be-5de183cb9913"]?.title).toBe("Fixing App Deletion Bug");
      expect(map["646708a0-b67a-403a-b9be-5de183cb9913"]?.cwd).toBe("~/Workspace/clipvibe");
    } finally {
      homedir.mockRestore();
    }
  });

  it("returns empty map on invalid data", () => {
    expect(buildMetaMapFromGlobalStateTrajectorySummariesValue("not-base64")).toEqual({});
  });
});

