import { afterEach, describe, expect, it, vi } from "vitest"

const readConfigMock = vi.hoisted(() => vi.fn())
const getCodexConversationMock = vi.hoisted(() => vi.fn())
const getTrajectoryMetaMapCachedMock = vi.hoisted(() => vi.fn())
const indexSessionMock = vi.hoisted(() => vi.fn())
const isSessionIndexedMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/server/config", () => ({
  readConfig: (...args: unknown[]) => readConfigMock(...args),
}))

vi.mock("@/lib/server/codex", () => ({
  getCodexConversation: (...args: unknown[]) => getCodexConversationMock(...args),
}))

vi.mock("@/lib/server/metaCache", () => ({
  getTrajectoryMetaMapCached: (...args: unknown[]) => getTrajectoryMetaMapCachedMock(...args),
}))

vi.mock("@/lib/server/searchIndex", () => ({
  indexSession: (...args: unknown[]) => indexSessionMock(...args),
  isSessionIndexed: (...args: unknown[]) => isSessionIndexedMock(...args),
}))

vi.mock("@/lib/server/antigravity", () => ({
  getAntigravityConversation: vi.fn(),
}))

vi.mock("@/lib/server/windsurf", () => ({
  getWindsurfChat: vi.fn(),
  getWindsurfTrajectory: vi.fn(),
}))

import { GET } from "@/app/api/conversations/[source]/[id]/route"

afterEach(() => {
  vi.restoreAllMocks()
  readConfigMock.mockReset()
  getCodexConversationMock.mockReset()
  getTrajectoryMetaMapCachedMock.mockReset()
  indexSessionMock.mockReset()
  isSessionIndexedMock.mockReset()
})

describe("GET /api/conversations/[source]/[id] (codex)", () => {
  it("re-indexes Codex sessions on open even when they were previously indexed", async () => {
    const config = {
      schemaVersion: 1,
      roots: [],
      windsurf: {},
      ui: { defaultSource: "codex", sortOrder: "mtime_desc" },
    }
    const events = [
      {
        source: "codex",
        kind: "user_message",
        ts: "2026-03-18T00:00:00.000Z",
        text: "hello",
        cwd: "/workspace/project",
      },
    ]

    readConfigMock.mockResolvedValue({ config })
    getCodexConversationMock.mockResolvedValue({
      events,
      summary: {
        turnCount: 1,
        toolCount: 0,
        commandCount: 0,
      },
    })
    getTrajectoryMetaMapCachedMock.mockResolvedValue({
      "session-1": { title: "Fresh Codex Session", cwd: "/workspace/project" },
    })
    isSessionIndexedMock.mockReturnValue(true)
    vi.spyOn(globalThis, "setImmediate").mockImplementation((fn: (...args: never[]) => void) => {
      fn()
      return 0 as never
    })

    const response = await GET(new Request("http://localhost/api/conversations/codex/session-1"), {
      params: { source: "codex", id: "session-1" },
    })

    await Promise.resolve()
    await Promise.resolve()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      kind: "trajectory",
      source: "codex",
      events,
      summary: {
        turnCount: 1,
        toolCount: 0,
        commandCount: 0,
      },
    })
    expect(isSessionIndexedMock).not.toHaveBeenCalled()
    expect(getTrajectoryMetaMapCachedMock).toHaveBeenCalledWith({ source: "codex", config })
    expect(indexSessionMock).toHaveBeenCalledWith(
      "session-1",
      "codex",
      "Fresh Codex Session",
      "/workspace/project",
      events,
    )
  })
})
