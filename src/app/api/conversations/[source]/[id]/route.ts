import { NextResponse } from "next/server";

import type { ConversationContent, Source, TrajectoryEvent } from "@/lib/types";
import { readConfig } from "@/lib/server/config";
import { getAntigravityConversation } from "@/lib/server/antigravity";
import { getWindsurfChat, getWindsurfTrajectory } from "@/lib/server/windsurf";
import { getCodexConversation } from "@/lib/server/codex";
import { getTrajectoryMetaMapCached } from "@/lib/server/metaCache";
import { indexSession, isSessionIndexed } from "@/lib/server/searchIndex";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSource(value: string): value is Source {
  return value === "antigravity" || value === "windsurf" || value === "codex";
}

/** Extract cwd from the first event that has one. */
function extractCwd(events: TrajectoryEvent[]): string {
  return events.find((e) => e.cwd)?.cwd ?? "";
}

export async function GET(req: Request, ctx: { params: { source: string; id: string } }) {
  const { source, id } = ctx.params;
  if (!isSource(source)) {
    return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  }
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const url = new URL(req.url);

  try {
    if (source === "antigravity") {
      const antigravity = await getAntigravityConversation(id);
      const out: ConversationContent = {
        kind: "trajectory",
        source: "antigravity",
        markdown: antigravity.markdown,
        events: antigravity.events,
        summary: antigravity.summary
      };
      // Index asynchronously — does not block the response.
      // Fetch title/cwd from the metadata cache (same source as the list view).
      const eventsSnap = antigravity.events;
      setImmediate(() => {
        readConfig()
          .then(({ config }) => getTrajectoryMetaMapCached({ source: "antigravity", config }))
          .then((metaMap) => {
            const meta = metaMap[id] ?? {};
            indexSession(id, "antigravity", meta.title ?? id, meta.cwd ?? extractCwd(eventsSnap), eventsSnap);
          })
          .catch((err) => {
            console.warn(`[search] Failed to index antigravity session ${id}:`, err instanceof Error ? err.message : err);
          });
      });
      return NextResponse.json(out);
    }

    if (source === "codex") {
      const { config } = await readConfig();
      const codex = await getCodexConversation(id, config);
      const out: ConversationContent = {
        kind: "trajectory",
        source: "codex",
        events: codex.events,
        summary: codex.summary
      };
      const eventsSnap = codex.events;
      setImmediate(() => {
        isSessionIndexed(id, "codex")
          .then((indexed) => {
            if (indexed) {
              return;
            }
            return readConfig()
              .then(({ config: cfg }) => getTrajectoryMetaMapCached({ source: "codex", config: cfg }))
              .then((metaMap) => {
                const meta = metaMap[id] ?? {};
                indexSession(id, "codex", meta.title ?? id, meta.cwd ?? extractCwd(eventsSnap), eventsSnap);
              });
          })
          .catch((err) => {
            console.warn(
              `[search] Failed to index codex session ${id}:`,
              err instanceof Error ? err.message : err
            );
          });
      });
      return NextResponse.json(out);
    }

    const stepOffset = Math.max(Number(url.searchParams.get("stepOffset") ?? "0"), 0);
    const view = url.searchParams.get("view");
    const includeCleared =
      url.searchParams.get("includeCleared") === "1" || url.searchParams.get("includeCleared") === "true";
    const { config } = await readConfig();

    if (view === "trajectory") {
      const trajectory = await getWindsurfTrajectory({ config, cascadeId: id, stepOffset, includeCleared });
      const out: ConversationContent = {
        kind: "trajectory",
        source: "windsurf",
        events: trajectory.events,
        summary: trajectory.summary,
        stepOffset: trajectory.nextStepOffset,
        ...(typeof trajectory.numTotalSteps === "number" ? { numTotalSteps: trajectory.numTotalSteps } : {})
      };
      // Index on first page only (stepOffset === 0).
      // Fetch all remaining pages in the background so the full session is indexed,
      // not just the first chunk the user loaded.
      if (stepOffset === 0) {
        const firstPageEvents = trajectory.events;
        const firstNextOffset = trajectory.nextStepOffset;
        const totalSteps = trajectory.numTotalSteps;
        setImmediate(() => {
          (async () => {
            try {
              const allEvents: TrajectoryEvent[] = [...firstPageEvents];
              let nextOffset = firstNextOffset;
              // Paginate until numTotalSteps is reached or the page returns no new events.
              while (true) {
                if (typeof totalSteps === "number" && nextOffset >= totalSteps) break;
                const page = await getWindsurfTrajectory({
                  config,
                  cascadeId: id,
                  stepOffset: nextOffset,
                  includeCleared
                });
                if (page.events.length === 0) break;
                allEvents.push(...page.events);
                nextOffset = page.nextStepOffset;
              }
              const metaMap = await getTrajectoryMetaMapCached({ source: "windsurf", config });
              const meta = metaMap[id] ?? {};
              indexSession(id, "windsurf", meta.title ?? id, meta.cwd ?? extractCwd(allEvents), allEvents);
            } catch (err) {
              console.warn(`[search] Failed to index windsurf session ${id}:`, err instanceof Error ? err.message : err);
            }
          })();
        });
      }
      return NextResponse.json(out);
    }

    const chat = await getWindsurfChat({ config, cascadeId: id, stepOffset, includeCleared });
    const out: ConversationContent = {
      kind: "chat",
      messages: chat.messages,
      stepOffset: chat.nextStepOffset,
      numTotalSteps: chat.numTotalSteps
    };
    // Index on first page load in the background so sessions opened in compact
    // (chat) mode are still discoverable via cross-session search.
    // Any search DB failures are best-effort and must not break chat reads.
    if (stepOffset === 0) {
      const totalSteps = chat.numTotalSteps;
      setImmediate(() => {
        (async () => {
          try {
            if (isSessionIndexed(id, source)) return;
            const allEvents: TrajectoryEvent[] = [];
            let nextOffset = 0;
            while (true) {
              if (typeof totalSteps === "number" && nextOffset >= totalSteps) break;
              const page = await getWindsurfTrajectory({
                config,
                cascadeId: id,
                stepOffset: nextOffset,
                includeCleared
              });
              if (page.events.length === 0) break;
              allEvents.push(...page.events);
              nextOffset = page.nextStepOffset;
            }
            const metaMap = await getTrajectoryMetaMapCached({ source, config });
            const meta = metaMap[id] ?? {};
            indexSession(id, source, meta.title ?? id, meta.cwd ?? extractCwd(allEvents), allEvents);
          } catch (err) {
            console.warn(`[search] Failed to index windsurf session ${id}:`, err instanceof Error ? err.message : err);
          }
        })();
      });
    }
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
