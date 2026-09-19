"use client";

import React from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type HandoffFlowStage = "options" | "preflight" | "result";
export type HandoffFlowState = { stage: HandoffFlowStage; busy: boolean; error?: string; preflight?: HandoffPreflight; result?: HandoffResult; outcome?: "confirmed" | "failed" };
export type HandoffPreflight = { status: "ready" | "ready_with_warnings" | "blocked"; checks: Array<{ id: string; status: string; detail?: string }>; warnings: string[]; missing: string[]; redaction?: { count: number; rules?: string[] } };
export type HandoffResult = { packageId: string; canonicalHash?: string; targetProvider?: string; validation?: HandoffPreflight; paths?: { markdown?: string; json?: string; codex?: string; provider?: string } };

export function handoffStatusLabel(status?: HandoffPreflight["status"]): string {
  if (status === "ready_with_warnings") return "Ready with warnings";
  if (status === "ready") return "Ready";
  if (status === "blocked") return "Blocked";
  return "Not checked";
}

export function reduceHandoffFlowState(state: HandoffFlowState, event: { type: "preflight"; preflight: HandoffPreflight } | { type: "create"; result: HandoffResult } | { type: "error"; error: string }): HandoffFlowState {
  if (event.type === "preflight") return { ...state, stage: "preflight", busy: false, error: undefined, preflight: event.preflight };
  if (event.type === "create") return { ...state, stage: "result", busy: false, error: undefined, result: event.result };
  return { ...state, busy: false, error: event.error };
}

export type HandoffFlowProps = { workItemId: string; onComplete?(): void };

export default function HandoffFlow({ workItemId, onComplete }: HandoffFlowProps) {
  const [targetProvider, setTargetProvider] = useState("codex");
  const [includeEvidence, setIncludeEvidence] = useState(false);
  const [redactPaths, setRedactPaths] = useState(true);
  const [truncateContent, setTruncateContent] = useState(true);
  const [state, setState] = useState<HandoffFlowState>({ stage: "options", busy: false });

  const request = async (mode: "preflight" | "create") => {
    setState((previous) => ({ ...previous, busy: true, error: undefined }));
    try {
      const response = await fetch(`/api/work-items/${encodeURIComponent(workItemId)}/handoff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, targetProvider, includeEvidence, redactPaths, truncateContent }) });
      const body = await response.json() as { preflight?: HandoffPreflight; packageId?: string; canonicalHash?: string; targetProvider?: string; validation?: HandoffPreflight; paths?: HandoffResult["paths"]; error?: string };
      if (!response.ok) throw new Error(body.error ?? "Handoff request failed");
      if (mode === "preflight" && body.preflight) setState((previous) => reduceHandoffFlowState(previous, { type: "preflight", preflight: body.preflight! }));
      else setState((previous) => reduceHandoffFlowState(previous, { type: "create", result: { packageId: body.packageId!, canonicalHash: body.canonicalHash, targetProvider: body.targetProvider, validation: body.validation, paths: body.paths } }));
    } catch (cause) { setState((previous) => reduceHandoffFlowState(previous, { type: "error", error: cause instanceof Error ? cause.message : "Handoff request failed" })); }
  };

  const recordOutcome = async (outcome: "confirmed" | "failed") => {
    if (!state.result) return;
    setState((previous) => ({ ...previous, busy: true, error: undefined }));
    try {
      const response = await fetch(`/api/work-items/${encodeURIComponent(workItemId)}/handoff`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "record-outcome", outcome: { id: `outcome-${state.result.packageId}-${outcome}`, packageId: state.result.packageId, packageHash: state.result.canonicalHash, target: { provider: state.result.targetProvider ?? targetProvider }, createdAt: new Date().toISOString(), method: "manual", outcome } }) });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to record handoff outcome");
      setState((previous) => ({ ...previous, busy: false, outcome }));
    } catch (cause) { setState((previous) => ({ ...previous, busy: false, error: cause instanceof Error ? cause.message : "Unable to record handoff outcome" })); }
  };

  const preflight = state.preflight;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="text-xs uppercase tracking-[0.2em] text-muted">Handoff</div><h3 className="mt-1 font-semibold">Prepare a verifiable work package</h3></div><Badge variant={state.stage === "result" ? "ok" : preflight?.status === "blocked" ? "bad" : "default"}>{state.stage === "options" ? "review options" : state.stage === "preflight" ? "preflight complete" : "package created"}</Badge></div>
      {state.stage === "options" || state.stage === "preflight" ? <div className="mt-4 grid gap-3"><label className="text-sm text-muted">Target provider<Select value={targetProvider} onChange={(event) => setTargetProvider(event.target.value)} className="mt-1"><option value="codex">Codex</option><option value="windsurf">Windsurf</option><option value="antigravity">Antigravity</option><option value="cursor">Cursor</option></Select></label><div className="grid gap-2 rounded-xl border border-border/70 bg-background/30 p-3 text-sm"><label className="flex items-center justify-between gap-3">Include bounded Session evidence <Switch checked={includeEvidence} onCheckedChange={setIncludeEvidence} /></label><label className="flex items-center justify-between gap-3">Redact local paths <Switch checked={redactPaths} onCheckedChange={setRedactPaths} /></label><label className="flex items-center justify-between gap-3">Bound long content <Switch checked={truncateContent} onCheckedChange={setTruncateContent} /></label></div>{preflight ? <div className="rounded-xl border border-border/70 p-3 text-sm"><div className="flex flex-wrap gap-2"><Badge variant={preflight.status === "blocked" ? "bad" : preflight.status === "ready" ? "ok" : "warn"}>{handoffStatusLabel(preflight.status)}</Badge>{preflight.redaction?.count ? <Badge variant="default">{preflight.redaction.count} redactions</Badge> : null}</div>{preflight.warnings.map((warning) => <p key={warning} className="mt-2 text-amber-200">{warning}</p>)}{preflight.missing.map((missing) => <p key={missing} className="mt-1 text-sm text-muted">Missing: {missing}</p>)}</div> : null}<Button disabled={state.busy} onClick={() => void request(state.stage === "options" ? "preflight" : "create")}>{state.busy ? "Checking…" : state.stage === "options" ? "Run preflight" : preflight?.status === "blocked" ? "Preflight blocked" : "Create work package"}</Button></div> : null}
      {state.stage === "result" && state.result ? <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4"><div className="font-medium">Package created</div><p className="mt-2 break-all text-sm text-muted">{state.result.packageId}</p>{state.result.canonicalHash ? <p className="mt-1 break-all text-xs text-muted">SHA-256: {state.result.canonicalHash}</p> : null}<p className="mt-2 text-xs text-muted">Target projection: {state.result.targetProvider ?? targetProvider}; generation does not inject into the provider session.</p>{state.outcome ? <Badge variant={state.outcome === "confirmed" ? "ok" : "bad"}>Handoff {state.outcome}</Badge> : <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" disabled={state.busy} onClick={() => void recordOutcome("confirmed")}>Confirm handoff</Button><Button size="sm" variant="outline" disabled={state.busy} onClick={() => void recordOutcome("failed")}>Record failed</Button></div>}<div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="ghost" onClick={onComplete}>Done</Button>{state.result.paths?.provider ? <span className="self-center text-xs text-muted">Provider projection saved locally</span> : null}</div></div> : null}
      {state.error ? <p className="mt-3 text-sm text-danger">{state.error}</p> : null}
    </Card>
  );
}
