import "server-only";

import fs from "node:fs";
import path from "node:path";

import { discoverProjectEvidence, type ProjectEvidenceFileSystem, type ProjectEvidenceProviderResult } from "@/lib/projectEvidenceProvider";

function safeRepoPath(rootDir: string, relativePath: string): string | null {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized.startsWith("../") || normalized.includes("/../")) return null;
  const absolutePath = path.resolve(rootDir, normalized);
  const relativeToRoot = path.relative(rootDir, absolutePath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) return null;
  return absolutePath;
}

function createRepoFileSystem(rootDir: string): ProjectEvidenceFileSystem {
  return {
    exists(relativePath) {
      const absolutePath = safeRepoPath(rootDir, relativePath);
      return absolutePath ? fs.existsSync(absolutePath) : false;
    },
    isFile(relativePath) {
      const absolutePath = safeRepoPath(rootDir, relativePath);
      return absolutePath ? fs.statSync(absolutePath).isFile() : false;
    },
    isDirectory(relativePath) {
      const absolutePath = safeRepoPath(rootDir, relativePath);
      return absolutePath ? fs.statSync(absolutePath).isDirectory() : false;
    },
    listDirectory(relativePath) {
      const absolutePath = safeRepoPath(rootDir, relativePath);
      if (!absolutePath) return [];
      return fs.readdirSync(absolutePath);
    },
    readFile(relativePath) {
      const absolutePath = safeRepoPath(rootDir, relativePath);
      if (!absolutePath) throw new Error("Path is outside the repository root.");
      return fs.readFileSync(absolutePath, "utf8");
    },
  };
}

export function getProjectEvidenceProviderResult(rootDir = process.cwd()): ProjectEvidenceProviderResult {
  return discoverProjectEvidence({
    fileSystem: createRepoFileSystem(rootDir),
    rootLabel: path.basename(rootDir) || "repository root",
  });
}
