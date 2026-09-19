#!/usr/bin/env node

const baseUrl = process.env.AGENT_STEWARD_VALIDATE_URL ?? "http://127.0.0.1:3108";
const projectRootPath = process.env.AGENT_STEWARD_VALIDATE_PROJECT_ROOT ?? process.cwd();
const prefix = process.env.AGENT_STEWARD_VALIDATE_PREFIX ?? `validation-${Date.now()}`;

const tasks = [
  ["bug-fix", "Fix a parser regression"],
  ["feature", "Add a bounded provider projection"],
  ["investigation", "Investigate an unreadable Session source"],
  ["documentation", "Document the handoff contract"],
  ["blocked", "Resolve a blocked migration decision"],
];

async function api(path, init) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  if (!response.ok) throw new Error(`${init?.method ?? "GET"} ${path} failed (${response.status}): ${body.error ?? "unknown error"}`);
  return body;
}

const results = [];
for (const [kind, goal] of tasks) {
  const created = await api("/api/work-items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectRootPath, projectName: "continuity-validation", goal: `${prefix}: ${goal}` }),
  });
  const item = created.workItem;
  const organized = await api(`/api/work-items/${encodeURIComponent(item.id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ goal: item.goal.value, organize: true, expectedVersion: item.version }),
  });
  const preflight = await api(`/api/work-items/${encodeURIComponent(item.id)}/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "preflight", targetProvider: "codex", redactPaths: true, truncateContent: true }),
  });
  const packageResult = await api(`/api/work-items/${encodeURIComponent(item.id)}/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "create", targetProvider: "codex", redactPaths: true, truncateContent: true }),
  });
  await api(`/api/work-items/${encodeURIComponent(item.id)}/handoff`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ mode: "record-outcome", outcome: { id: `${prefix}-${kind}-confirmed`, packageId: packageResult.packageId, packageHash: packageResult.canonicalHash, target: { provider: "codex" }, createdAt: new Date().toISOString(), method: "manual", outcome: "confirmed" } }),
  });
  const finalItem = (await api(`/api/work-items/${encodeURIComponent(item.id)}`)).workItem;
  const confirmed = finalItem.handoffs?.some((handoff) => handoff.outcome === "confirmed" && handoff.packageId === packageResult.packageId) ?? false;
  if (!confirmed) throw new Error(`Outcome was not preserved for ${kind}`);
  results.push({ kind, workItemId: organized.workItem.id, preflight: preflight.preflight.status, packageId: packageResult.packageId, canonicalHash: packageResult.canonicalHash, confirmed });
}

const summary = {
  baseUrl,
  projectRootPath,
  prefix,
  taskCount: results.length,
  packageCreated: results.filter((result) => result.packageId).length,
  handoffConfirmed: results.filter((result) => result.confirmed).length,
  results,
};
console.log(JSON.stringify(summary, null, 2));
