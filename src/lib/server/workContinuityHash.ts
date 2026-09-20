import "server-only";

import crypto from "node:crypto";

import { canonicalJson } from "@/lib/workContinuity";

export function canonicalBytes(value: unknown): Buffer {
  return Buffer.from(canonicalJson(value), "utf8");
}

export function sha256(value: string | Buffer | unknown): string {
  const bytes = typeof value === "string" || Buffer.isBuffer(value) ? value : canonicalBytes(value);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export const sha256Canonical = (value: unknown): string => sha256(canonicalBytes(value));
export const hashCanonicalJson = sha256Canonical;

export function createProjectionEnvelope(input: {
  provider: string;
  canonicalHash: string;
  content: string;
  format?: string;
  warnings?: string[];
}): { provider: string; canonicalHash: string; content: string; format: string; hash: string; warnings: string[] } {
  const envelope = {
    provider: input.provider,
    canonicalHash: input.canonicalHash,
    content: input.content,
    format: input.format ?? "text/markdown",
    warnings: input.warnings ?? [],
  };
  return { ...envelope, hash: sha256Canonical(envelope) };
}
