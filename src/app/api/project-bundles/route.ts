import { NextResponse } from "next/server";

import {
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

  if (body.mode !== undefined && body.mode !== "validate" && body.mode !== "generate") {
    return NextResponse.json(
      {
        error: `Unsupported mode: ${String(body.mode)}`,
        code: "INVALID_MODE",
        title: "Invalid request",
        hint: "Use mode validate or generate.",
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
      return NextResponse.json(generated);
    }

    const validation = await validateProjectBundle(selection, configuration);
    return NextResponse.json(validation);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        code: "PROJECT_BUNDLE_FAILED",
        title: body.mode === "generate" ? "Bundle generation failed" : "Bundle validation failed",
      },
      { status: 400 }
    );
  }
}
