import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";

const validateProjectBundleMock = vi.hoisted(() => vi.fn());
const generateProjectBundleMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/projectBundleService", () => ({
  validateProjectBundle: (...args: unknown[]) => validateProjectBundleMock(...args),
  generateProjectBundle: (...args: unknown[]) => generateProjectBundleMock(...args),
}));

// @ts-expect-error Next.js route module typing does not match this Vitest import pattern in tests
import { POST } from "@/app/api/project-bundles/route";

afterEach(() => {
  validateProjectBundleMock.mockReset();
  generateProjectBundleMock.mockReset();
});

describe("project bundle route", () => {
  it("routes validate requests to validateProjectBundle", async () => {
    validateProjectBundleMock.mockResolvedValue({
      validation: { status: "valid", items: [] },
      summary: {
        warningCount: 0,
        blockerCount: 0,
        selectedCategoryCount: 2,
        selectedSessionCount: 0,
        resolvedReferenceCount: 2,
        unresolvedReferenceCount: 0,
      },
      memberInventory: [],
      memberReferences: [],
    });

    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "validate",
          selection: {
            includedCategories: {
              sessions: false,
              rules: true,
              memory: false,
              skills: false,
              commands: false,
            },
          },
          configuration: {
            bundleName: "My bundle",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(validateProjectBundleMock).toHaveBeenCalledTimes(1);
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    const [selection, configuration] = validateProjectBundleMock.mock.calls[0]!;
    expect(selection.includedCategories.rules).toBe(true);
    expect(selection.includedCategories.sessions).toBe(false);
    expect(configuration.bundleName).toBe("My bundle");
  });

  it("routes generate requests to generateProjectBundle", async () => {
    generateProjectBundleMock.mockResolvedValue({
      validation: { status: "valid", items: [] },
      summary: {
        warningCount: 0,
        blockerCount: 0,
        selectedCategoryCount: 1,
        selectedSessionCount: 1,
        resolvedReferenceCount: 1,
        unresolvedReferenceCount: 0,
      },
      memberInventory: [],
      memberReferences: [],
      packageId: "project-bundle-1",
      filePath: `${os.homedir()}/.agent-storage-manager/project-bundle-1.bundle.json`,
      createdAt: "2026-04-18T06:00:00.000Z",
      document: { shouldNotLeak: true },
    });

    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "generate",
          handoff: {
            origin: "overview",
            workflowType: "project-bundle",
            projectBundleScopeHint: "overview-routed project context",
          },
          selection: {
            includedCategories: {
              sessions: true,
              rules: false,
              memory: false,
              skills: false,
              commands: false,
            },
            sessionSelections: [
              {
                sessionId: "session-1",
                source: "codex",
              },
            ],
          },
          configuration: {
            bundleName: "Generated bundle",
            notes: "  note  ",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(generateProjectBundleMock).toHaveBeenCalledTimes(1);
    const json = await response.json();
    expect(json.filePath).toBe("~/.agent-storage-manager/project-bundle-1.bundle.json");
    expect(json.createdAt).toBe("2026-04-18T06:00:00.000Z");
    expect(json.document).toBeUndefined();
    const [selection, configuration] = generateProjectBundleMock.mock.calls[0]!;
    expect(selection.scopeHint).toBe("overview-routed project context");
    expect(selection.sessionSelections).toHaveLength(1);
    expect(configuration.notes).toBe("note");
  });

  it("returns a structured 400 when the service throws", async () => {
    validateProjectBundleMock.mockRejectedValue(new Error("bundle failed"));

    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "validate",
          configuration: {
            bundleName: "Broken bundle",
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Project bundle validation failed.",
      code: "PROJECT_BUNDLE_FAILED",
      title: "Bundle validation failed",
      hint: "Review bundle selection and configuration, then retry validation.",
    });
  });

  it("rejects unknown mode values instead of silently treating them as validation", async () => {
    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "oops",
          configuration: {
            bundleName: "Broken mode",
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(validateProjectBundleMock).not.toHaveBeenCalled();
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Unsupported project bundle mode.",
      code: "INVALID_MODE",
      title: "Invalid request",
      hint: "Use mode validate or generate.",
    });
  });

  it("returns a structured 400 for invalid JSON", async () => {
    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: "{not json",
      })
    );

    expect(response.status).toBe(400);
    expect(validateProjectBundleMock).not.toHaveBeenCalled();
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Invalid JSON body",
      code: "INVALID_REQUEST",
      title: "Invalid request",
      hint: "Send a JSON body with mode, selection, and configuration.",
    });
  });

  it("rejects missing mode values instead of defaulting to validation", async () => {
    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          configuration: {
            bundleName: "Missing mode",
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(validateProjectBundleMock).not.toHaveBeenCalled();
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    expect((await response.json()).code).toBe("INVALID_MODE");
  });

  it("rejects generate mode when explicit selection or configuration is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "generate",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(validateProjectBundleMock).not.toHaveBeenCalled();
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      error: "Generate mode requires explicit selection and configuration.",
      code: "MISSING_GENERATE_INPUT",
      title: "Invalid request",
      hint: "Run explicit composition first, then submit selection and configuration for generation.",
    });
  });

  it("rejects generate mode when selection omits explicit category composition", async () => {
    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "generate",
          selection: {
            sessionSelections: [
              {
                sessionId: "session-1",
                source: "codex",
              },
            ],
          },
          configuration: {
            bundleName: "Generated bundle",
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(validateProjectBundleMock).not.toHaveBeenCalled();
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    expect((await response.json()).code).toBe("MISSING_GENERATE_INPUT");
  });

  it("rejects generate mode when explicit category composition values are not booleans", async () => {
    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "generate",
          selection: {
            includedCategories: {
              sessions: "false",
              rules: true,
              memory: false,
              skills: false,
              commands: false,
              __proto__: { polluted: true },
            },
          },
          configuration: {
            bundleName: "Generated bundle",
          },
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(generateProjectBundleMock).not.toHaveBeenCalled();
    expect((await response.json()).code).toBe("MISSING_GENERATE_INPUT");
  });

  it("converts non-home bundle file locations to display-safe paths", async () => {
    generateProjectBundleMock.mockResolvedValue({
      validation: { status: "valid", items: [] },
      summary: {
        warningCount: 0,
        blockerCount: 0,
        selectedCategoryCount: 1,
        selectedSessionCount: 0,
        resolvedReferenceCount: 1,
        unresolvedReferenceCount: 0,
      },
      memberInventory: [],
      memberReferences: [],
      packageId: "project-bundle-2",
      createdAt: "2026-04-18T06:01:00.000Z",
      filePath: "/tmp/private-user/project-bundles/project-bundle-2.bundle.json",
    });

    const response = await POST(
      new Request("http://localhost/api/project-bundles", {
        method: "POST",
        body: JSON.stringify({
          mode: "generate",
          selection: {
            includedCategories: {
              sessions: false,
              rules: true,
              memory: false,
              skills: false,
              commands: false,
            },
          },
          configuration: {
            bundleName: "Generated bundle",
          },
        }),
      })
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.filePath).toBe("project-bundles/project-bundle-2.bundle.json");
    expect(JSON.stringify(json)).not.toContain("/tmp/private-user");
  });
});
