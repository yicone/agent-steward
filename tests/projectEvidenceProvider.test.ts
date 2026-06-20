import { describe, expect, it } from "vitest";

import {
  createProjectEvidenceDiagnosticsFindings,
  discoverProjectEvidence,
  normalizeProjectEvidenceItem,
  type ProjectEvidenceFileSystem,
} from "@/lib/projectEvidenceProvider";

function createMemoryFileSystem(files: Record<string, string | Error>): ProjectEvidenceFileSystem & { attempts: string[] } {
  const attempts: string[] = [];
  const normalizedFiles = new Map(Object.entries(files).map(([key, value]) => [key.replaceAll("\\", "/"), value]));
  const directories = new Set<string>([""]);
  for (const filePath of normalizedFiles.keys()) {
    const parts = filePath.split("/");
    for (let index = 1; index < parts.length; index += 1) {
      directories.add(parts.slice(0, index).join("/"));
    }
  }

  return {
    attempts,
    exists(relativePath) {
      attempts.push(relativePath);
      return normalizedFiles.has(relativePath) || directories.has(relativePath);
    },
    isFile(relativePath) {
      attempts.push(relativePath);
      return normalizedFiles.has(relativePath);
    },
    isDirectory(relativePath) {
      attempts.push(relativePath);
      return directories.has(relativePath);
    },
    listDirectory(relativePath) {
      attempts.push(relativePath);
      const prefix = relativePath ? `${relativePath}/` : "";
      const names = new Set<string>();
      for (const filePath of [...normalizedFiles.keys(), ...directories]) {
        if (!filePath.startsWith(prefix) || filePath === relativePath) continue;
        const rest = filePath.slice(prefix.length);
        if (!rest) continue;
        names.add(rest.split("/")[0]!);
      }
      return [...names];
    },
    readFile(relativePath) {
      attempts.push(relativePath);
      const value = normalizedFiles.get(relativePath);
      if (value instanceof Error) throw value;
      if (typeof value !== "string") throw new Error("missing");
      return value;
    },
  };
}

describe("discoverProjectEvidence", () => {
  it("discovers known instruction, skill, workflow, prompt, and hook paths", () => {
    const fs = createMemoryFileSystem({
      "AGENTS.md": "# Agent rules",
      ".github/copilot-instructions.md": "# Copilot rules",
      ".github/instructions/parser.instructions.md": "# Parser instructions",
      ".github/prompts/opsx-apply.prompt.md": "# Prompt",
      ".github/skills/ops/SKILL.md": "# GitHub skill",
      ".codex/skills/ops/SKILL.md": "# Codex skill",
      ".codex/agents/reviewer.toml": "name = 'reviewer'",
      ".codex/hooks.json": "{}",
      ".agents/skills/release/SKILL.md": "# Release skill",
      ".agent/skills/release/SKILL.md": "# Release skill",
      ".windsurf/skills/ops/SKILL.md": "# Windsurf skill",
      ".windsurf/rules/engineering.md": "# Windsurf rule",
      ".windsurf/workflows/opsx-apply.md": "# Windsurf workflow",
      ".windsurf/hooks.json": "{}",
      ".windsurf/hooks/guard.py": "print('guard')",
      ".devin/skills/ops/SKILL.md": "# Devin skill",
      ".devin/rules/engineering.md": "# Devin rule",
      ".devin/workflows/opsx-apply.md": "# Devin workflow",
      ".devin/plans/compat.md": "# Devin plan",
      ".devin/hooks.json": "{}",
      ".devin/hooks/guard.py": "print('guard')",
      ".cursor/mcp.json": "{\"mcpServers\":{}}",
      ".cursorrules": "Always prefer local-first behavior",
      ".cursor/rules/repo.mdc": "---\ndescription: Repo rule\n---\nUse project conventions",
    });

    const result = discoverProjectEvidence({ fileSystem: fs });
    const paths = result.items.map((item) => item.path);

    expect(result.status).toBe("available");
    expect(paths).toContain("AGENTS.md");
    expect(paths).toContain(".github/prompts/opsx-apply.prompt.md");
    expect(paths).toContain(".codex/hooks.json");
    expect(paths).toContain(".windsurf/workflows/opsx-apply.md");
    expect(paths).toContain(".windsurf/hooks/guard.py");
    expect(paths).toContain(".devin/workflows/opsx-apply.md");
    expect(paths).toContain(".devin/plans/compat.md");
    expect(paths).toContain(".devin/hooks/guard.py");
    expect(paths).toContain(".cursor/mcp.json");
    expect(paths).toContain(".cursorrules");
    expect(paths).toContain(".cursor/rules/repo.mdc");
    expect(result.assets.some((asset) => asset.subtype === "rule")).toBe(true);
    expect(result.assets.some((asset) => asset.subtype === "skill")).toBe(true);
    expect(result.assets.some((asset) => asset.subtype === "command")).toBe(true);
    expect(result.assets.every((asset) => !asset.provenance.startsWith("/"))).toBe(true);
  });

  it("excludes arbitrary source files and session parser inputs instead of keyword scanning", () => {
    const fs = createMemoryFileSystem({
      "src/app/agent-skill-command.ts": "agent skill prompt rule",
      "tests/fixtures/session.jsonl": "{\"type\":\"message\"}",
      ".codex/sessions/2026/04/19/rollout.jsonl": "{\"role\":\"user\"}",
      "AGENTS.md": "# Real rule",
    });

    const result = discoverProjectEvidence({ fileSystem: fs });

    expect(result.items.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(fs.attempts.some((path) => path.startsWith("src/"))).toBe(false);
    expect(fs.attempts.some((path) => path.includes("sessions"))).toBe(false);
  });

  it("does not read user-global stores, external paths, cloud sources, or paths outside the repository root", () => {
    const fs = createMemoryFileSystem({
      "../outside/AGENTS.md": "# Outside",
      "/tmp/AGENTS.md": "# External",
      "~/.codex/skills/global/SKILL.md": "# Global",
      ".github/workflows/ci.yml": "name: ci",
      ".codex/hooks/guard.py": "print('guard')",
    });

    const result = discoverProjectEvidence({ fileSystem: fs });

    expect(result.assets).toEqual([]);
    expect(result.diagnostics.map((item) => item.kind)).toContain("unsupported");
    expect(fs.attempts.every((path) => !path.startsWith("../") && !path.startsWith("/") && !path.startsWith("~"))).toBe(true);
  });

  it("keeps ambiguous evidence unknown during normalization", () => {
    const item = normalizeProjectEvidenceItem({
      path: ".github/prompts/custom.txt",
      kind: "unknown",
      content: "custom command",
    });

    expect(item.kind).toBe("unknown");
    expect(item.status).toBe("ambiguous");
  });

  it("reports empty, partial, and unavailable status explicitly", () => {
    expect(discoverProjectEvidence({ fileSystem: createMemoryFileSystem({}) }).status).toBe("empty");

    expect(
      discoverProjectEvidence({
        fileSystem: createMemoryFileSystem({
          "AGENTS.md": "# Rules",
          ".codex/hooks.json": new Error("denied"),
        }),
      }).status
    ).toBe("partial");

    expect(
      discoverProjectEvidence({
        fileSystem: createMemoryFileSystem({
          "AGENTS.md": new Error("denied"),
        }),
      }).status
    ).toBe("unavailable");
  });

  it("converts warning diagnostics into bounded analysis findings", () => {
    const result = discoverProjectEvidence({
      fileSystem: createMemoryFileSystem({
        "AGENTS.md": new Error("denied"),
      }),
    });

    const findings = createProjectEvidenceDiagnosticsFindings(result);

    expect(findings).toEqual([
      expect.objectContaining({
        title: "Provider unreadable evidence: AGENTS.md",
        issueClass: "provenance",
        affectedObjectType: "project",
      }),
    ]);
    expect(findings[0]!.whyItMatters).toContain("bounded project evidence provider diagnostic");
  });
});
