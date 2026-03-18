import "server-only";

import type { AppConfig, ConversationMeta, Source } from "@/lib/types";
import { connectUnaryJson } from "@/lib/server/connect";
import { findLatestAntigravityDiscovery, resolveAntigravityRpcTarget } from "@/lib/server/antigravity";
import { getAntigravityTrajectoryMetaMapFromVscdb } from "@/lib/server/antigravityGlobalState";
import { getWindsurfDiagnosticBundle } from "@/lib/server/windsurf";
import { getCodexRawContent } from "@/lib/server/codex";

const SERVICE = "exa.language_server_pb.LanguageServerService";

export type DiagnosticExport = {
  schemaVersion: 1;
  generatedAt: string;
  source: Source;
  cascadeId: string;
  antigravity?: {
    discoveryPath: string;
    httpPort?: number;
    httpsPort?: number;
    reachable?: boolean;
    metaFromVscdb?: { title?: string; cwd?: string };
    getCascadeTrajectoryResponse: unknown;
    convertTrajectoryToMarkdownResponse: unknown;
    markdown: string;
  };
  windsurf?: Awaited<ReturnType<typeof getWindsurfDiagnosticBundle>>;
  codex?: Awaited<ReturnType<typeof getCodexRawContent>>;
};

export async function buildDiagnosticExport(params: {
  source: Source;
  cascadeId: string;
  rootId?: string;
  config: AppConfig;
  windsurf?: {
    allSteps?: boolean;
    maxSteps?: number;
  };
}): Promise<DiagnosticExport> {
  const { source, cascadeId, config } = params;
  const generatedAt = new Date().toISOString();

  if (source === "antigravity") {
    const found = await findLatestAntigravityDiscovery();
    if (!found) throw new Error("Antigravity discovery file not found. Open Antigravity to start the daemon.");

    const { discoveryPath, discovery } = found;
    const target = await resolveAntigravityRpcTarget(discovery);
    const baseUrl = target.baseUrl;

    let reachable = false;
    try {
      await connectUnaryJson({
        baseUrl,
        serviceTypeName: SERVICE,
        methodName: "Heartbeat",
        csrfToken: discovery.csrfToken,
        dispatcher: target.dispatcher,
        body: { metadata: {} },
        timeoutMs: 2500
      });
      reachable = true;
    } catch {
      reachable = false;
    }

    const getCascadeTrajectoryResponse = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "GetCascadeTrajectory",
      csrfToken: discovery.csrfToken,
      dispatcher: target.dispatcher,
      body: { cascadeId, verbosity: "CLIENT_TRAJECTORY_VERBOSITY_PROD_UI" }
    });

    const trajectory = getCascadeTrajectoryResponse?.trajectory;
    if (!trajectory) throw new Error("Trajectory not found for this cascadeId (may be deleted from the LS database).");

    const convertTrajectoryToMarkdownResponse = await connectUnaryJson<any>({
      baseUrl,
      serviceTypeName: SERVICE,
      methodName: "ConvertTrajectoryToMarkdown",
      csrfToken: discovery.csrfToken,
      dispatcher: target.dispatcher,
      body: { trajectory }
    });

    const markdown = convertTrajectoryToMarkdownResponse?.markdown;
    if (typeof markdown !== "string") throw new Error("ConvertTrajectoryToMarkdown returned no markdown.");

    const vscdbMap = await getAntigravityTrajectoryMetaMapFromVscdb().catch(
      (): Record<string, ConversationMeta> => ({})
    );
    const metaFromVscdb = vscdbMap[cascadeId];

    return {
      schemaVersion: 1,
      generatedAt,
      source,
      cascadeId,
      antigravity: {
        discoveryPath,
        httpPort: discovery.httpPort,
        httpsPort: discovery.httpsPort,
        reachable,
        ...(metaFromVscdb ? { metaFromVscdb } : {}),
        getCascadeTrajectoryResponse,
        convertTrajectoryToMarkdownResponse,
        markdown
      }
    };
  }

  if (source === "codex") {
    const codex = await getCodexRawContent(cascadeId, config, { preferredRootId: params.rootId });
    return {
      schemaVersion: 1,
      generatedAt,
      source,
      cascadeId,
      codex
    };
  }

  const windsurf = await getWindsurfDiagnosticBundle({
    config,
    cascadeId,
    allSteps: params.windsurf?.allSteps ?? true,
    maxSteps: params.windsurf?.maxSteps
  });

  return {
    schemaVersion: 1,
    generatedAt,
    source,
    cascadeId,
    windsurf
  };
}
