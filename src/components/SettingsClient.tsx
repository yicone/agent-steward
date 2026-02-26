"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import type { AppConfig, RootConfig, Source, SourcesStatus } from "@/lib/types";

type ApiConfigResponse = { path: string; config: AppConfig };

function cloneConfig(config: AppConfig): AppConfig {
  return JSON.parse(JSON.stringify(config)) as AppConfig;
}

function RootRow(props: {
  root: RootConfig;
  onToggle(): void;
  onRemove(): void;
}) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="split" style={{ gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="mono" style={{ fontSize: 12, wordBreak: "break-all" }}>
              {props.root.path}
            </div>
            <span className="pill">{props.root.id}</span>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            source: <span className="mono">{props.root.source}</span>
          </div>
        </div>
        <div className="row">
          <button className={`btn ${props.root.enabled ? "primary" : ""}`} onClick={props.onToggle}>
            {props.root.enabled ? "Enabled" : "Disabled"}
          </button>
          <button className="btn danger" onClick={props.onRemove}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsClient() {
  const [configPath, setConfigPath] = useState<string>("");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<SourcesStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newSource, setNewSource] = useState<Source>("antigravity");
  const [newPath, setNewPath] = useState("");

  const rootsBySource = useMemo(() => {
    const roots = config?.roots ?? [];
    return {
      antigravity: roots.filter((r) => r.source === "antigravity"),
      windsurf: roots.filter((r) => r.source === "windsurf")
    };
  }, [config]);

  async function refresh() {
    setError(null);
    const cfgRes = await fetch("/api/config");
    const cfgJson = (await cfgRes.json()) as ApiConfigResponse;
    setConfigPath(cfgJson.path);
    setConfig(cfgJson.config);

    const stRes = await fetch("/api/sources");
    setStatus((await stRes.json()) as SourcesStatus);
  }

  async function save(nextConfig: AppConfig) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: nextConfig })
      });
      const json = (await res.json()) as ApiConfigResponse;
      if (!res.ok) throw new Error((json as any)?.error ?? "Failed to save config");
      setConfigPath(json.path);
      setConfig(json.config);
      const stRes = await fetch("/api/sources");
      setStatus((await stRes.json()) as SourcesStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh().catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <div className="container">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
        <div className="row">
          <div style={{ fontSize: 18, fontWeight: 650 }}>Settings</div>
          <span className="pill" title={configPath}>
            config.json
          </span>
        </div>
        <div className="row">
          <button className="btn" onClick={() => refresh()} disabled={saving}>
            Refresh
          </button>
          <Link className="btn" href="/">
            Back
          </Link>
        </div>
      </div>

      {error ? (
        <div className="bubble system" style={{ borderColor: "rgba(251, 113, 133, 0.55)", color: "rgba(251,113,133,0.95)" }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Windsurf token override (fallback)</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Attach mode prefers reading <span className="mono">--csrf_token</span> from the Windsurf LS process. If that fails on your system, you can paste the token here.
        </div>
        <div className="row">
          <input
            className="input mono"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={config?.windsurf.csrfTokenOverride ?? ""}
            onChange={(e) => {
              if (!config) return;
              const next = cloneConfig(config);
              next.windsurf.csrfTokenOverride = e.target.value;
              setConfig(next);
            }}
          />
          <button className="btn primary" disabled={!config || saving} onClick={() => config && save(config)}>
            Save
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Add root</div>
        <div className="row">
          <select className="input" style={{ maxWidth: 180 }} value={newSource} onChange={(e) => setNewSource(e.target.value as Source)}>
            <option value="antigravity">antigravity</option>
            <option value="windsurf">windsurf</option>
          </select>
          <input className="input mono" placeholder="e.g. ~/.gemini/antigravity/conversations" value={newPath} onChange={(e) => setNewPath(e.target.value)} />
          <button
            className="btn primary"
            disabled={!config || saving || !newPath.trim()}
            onClick={() => {
              if (!config) return;
              const next = cloneConfig(config);
              next.roots.push({
                id: crypto.randomUUID(),
                source: newSource,
                path: newPath.trim(),
                enabled: true
              });
              setNewPath("");
              save(next).catch(() => {});
            }}
          >
            Add
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, marginBottom: 10 }}>Antigravity roots</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rootsBySource.antigravity.map((r) => (
              <RootRow
                key={r.id}
                root={r}
                onToggle={() => {
                  if (!config) return;
                  const next = cloneConfig(config);
                  const idx = next.roots.findIndex((x) => x.id === r.id);
                  if (idx >= 0) next.roots[idx].enabled = !next.roots[idx].enabled;
                  save(next).catch(() => {});
                }}
                onRemove={() => {
                  if (!config) return;
                  const next = cloneConfig(config);
                  next.roots = next.roots.filter((x) => x.id !== r.id);
                  save(next).catch(() => {});
                }}
              />
            ))}
            {rootsBySource.antigravity.length === 0 ? <div className="muted">No roots.</div> : null}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 650, marginBottom: 10 }}>Windsurf roots</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rootsBySource.windsurf.map((r) => (
              <RootRow
                key={r.id}
                root={r}
                onToggle={() => {
                  if (!config) return;
                  const next = cloneConfig(config);
                  const idx = next.roots.findIndex((x) => x.id === r.id);
                  if (idx >= 0) next.roots[idx].enabled = !next.roots[idx].enabled;
                  save(next).catch(() => {});
                }}
                onRemove={() => {
                  if (!config) return;
                  const next = cloneConfig(config);
                  next.roots = next.roots.filter((x) => x.id !== r.id);
                  save(next).catch(() => {});
                }}
              />
            ))}
            {rootsBySource.windsurf.length === 0 ? <div className="muted">No roots.</div> : null}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 12, marginTop: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Diagnostics</div>
        <pre style={{ margin: 0, overflowX: "auto" }}>{JSON.stringify(status, null, 2)}</pre>
      </div>
    </div>
  );
}

