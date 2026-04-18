import os from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import {
  PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES,
  createDefaultProjectBundleSelection,
  type BackupMigrationHandoff,
  type BackupSessionSelection,
  type ProjectBundleConfiguration,
} from "@/lib/backupMigration";
import { generateProjectBundle, validateProjectBundle } from "@/lib/server/projectBundleService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProjectBundleRequestBody = {
  mode?: "validate" | "generate";
  selection?: {
    includedCategories?: Partial<ReturnType<typeof createDefaultProjectBundleSelection>["includedCategories"]>;
    sessionSelections?: BackupSessionSelection[];
    objectRefs?: string[];
    originCue?: string;
    scopeHint?: string;
    filterHint?: string;
  };
  configuration?: ProjectBundleConfiguration;
  handoff?: BackupMigrationHandoff | null;
};

function normalizeConfiguration(input?: ProjectBundleConfiguration | null): ProjectBundleConfiguration {
  return {
    bundleName: input?.bundleName?.trim() ?? "",
    notes: input?.notes?.trim() || undefined,
  };
}

function toDisplaySafeBundlePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const normalizedHome = os.homedir().replace(/\\/g, "/");
  const homeRelative = normalized === normalizedHome || normalized.startsWith(`${normalizedHome}/`)
    ? normalized.replace(normalizedHome, "~")
    : normalized;

  if (!homeRelative.startsWith("~")) {
    return `project-bundles/${path.basename(normalized)}`;
  }

  return homeRelative;
}

function hasExplicitComposition(selection: ProjectBundleRequestBody["selection"]): boolean {
  if (!selection?.includedCategories) {
    return false;
  }

  return PROJECT_BUNDLE_SELECTABLE_MEMBER_CATEGORIES.every((category) =>
    Object.prototype.hasOwnProperty.call(selection.includedCategories, category)
  );
}

export async function POST(req: Request) {
  let body: ProjectBundleRequestBody;
  try {
    body = (await req.json()) as ProjectBundleRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body",
        code: "INVALID_REQUEST",
        title: "Invalid request",
        hint: "Send a JSON body with mode, selection, and configuration.",
      },
      { status: 400 }
    );
  }

  if (body.mode !== "validate" && body.mode !== "generate") {
    return NextResponse.json(
      {
        error: "Unsupported project bundle mode.",
        code: "INVALID_MODE",
        title: "Invalid request",
        hint: "Use mode validate or generate.",
      },
      { status: 400 }
    );
  }

  if (body.mode === "generate" && (!body.selection || !body.configuration || !hasExplicitComposition(body.selection))) {
    return NextResponse.json(
      {
        error: "Generate mode requires explicit selection and configuration.",
        code: "MISSING_GENERATE_INPUT",
        title: "Invalid request",
        hint: "Run explicit composition first, then submit selection and configuration for generation.",
      },
      { status: 400 }
    );
  }

  const configuration = normalizeConfiguration(body.configuration);
  const selection = createDefaultProjectBundleSelection(body.handoff ?? null, body.selection?.sessionSelections ?? []);

  selection.includedCategories = {
    ...selection.includedCategories,
    ...(body.selection?.includedCategories ?? {}),
  };
  selection.objectRefs = Array.from(new Set((body.selection?.objectRefs ?? selection.objectRefs).map((item) => item.trim()).filter(Boolean)));
  selection.originCue = body.selection?.originCue?.trim() || selection.originCue;
  selection.scopeHint = body.selection?.scopeHint?.trim() || selection.scopeHint;
  selection.filterHint = body.selection?.filterHint?.trim() || selection.filterHint;

  try {
    if (body.mode === "generate") {
      const generated = await generateProjectBundle(selection, configuration);
      return NextResponse.json({
        validation: generated.validation,
        summary: generated.summary,
        memberInventory: generated.memberInventory,
        memberReferences: generated.memberReferences,
        packageId: generated.packageId,
        createdAt: generated.createdAt,
        filePath: toDisplaySafeBundlePath(generated.filePath),
      });
    }

    const validation = await validateProjectBundle(selection, configuration);
    return NextResponse.json(validation);
  } catch {
    return NextResponse.json(
      {
        error: body.mode === "generate"
          ? "Project bundle generation failed."
          : "Project bundle validation failed.",
        code: "PROJECT_BUNDLE_FAILED",
        title: body.mode === "generate" ? "Bundle generation failed" : "Bundle validation failed",
        hint: body.mode === "generate"
          ? "Review validation output and bundle configuration, then try generation again."
          : "Review bundle selection and configuration, then retry validation.",
      },
      { status: 400 }
    );
  }
}
