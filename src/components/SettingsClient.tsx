"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AppConfig, RootConfig, RootHealth, Source, SourcesStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type ApiConfigResponse = { path: string; config: AppConfig };

function cloneConfig(config: AppConfig): AppConfig {
  return JSON.parse(JSON.stringify(config)) as AppConfig;
}

const healthColors: Record<string, string> = {
  healthy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  missing: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  unreadable: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  slow: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
};

function HealthBadge({ health }: { health: RootHealth | undefined }) {
  if (!health) return null;
  const color = healthColors[health.status] ?? "";
  const label =
    health.status === "healthy"
      ? `${health.pbCount} pb · ${health.scanMs}ms`
      : health.status === "slow"
        ? `${health.pbCount} pb · slow (${health.scanMs}ms)`
        : health.error ?? health.status;
  return (
    <span className={cn("inline-block rounded px-1.5 py-0.5 text-[10px] font-medium", color)} title={label}>
      {health.status === "healthy" || health.status === "slow"
        ? `${health.pbCount} pb`
        : health.status}
      {health.status === "slow" ? ` · ${health.scanMs}ms` : null}
    </span>
  );
}

function RootRow(props: {
  root: RootConfig;
  health?: RootHealth;
  onToggle(): void;
  onRemove(): void;
}) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-xs font-mono break-all">{props.root.path}</div>
            <Badge className="shrink-0" title={props.root.id}>
              {props.root.id.slice(0, 8)}
            </Badge>
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted">
            <span>
              source: <span className="font-mono">{props.root.source}</span>
            </span>
            <HealthBadge health={props.health} />
          </div>
          {props.health?.error ? (
            <div className="mt-1 text-[10px] text-red-600 dark:text-red-400">{props.health.error}</div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant={props.root.enabled ? "default" : "outline"}
            size="sm"
            onClick={props.onToggle}
          >
            {props.root.enabled ? "Enabled" : "Disabled"}
          </Button>
          <Button variant="destructive" size="sm" onClick={props.onRemove}>
            Remove
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function SettingsClient() {
  const [configPath, setConfigPath] = useState<string>("");
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [status, setStatus] = useState<SourcesStatus | null>(null);
  const [rootHealthMap, setRootHealthMap] = useState<Record<string, RootHealth>>({});
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

    const [stRes, healthRes] = await Promise.all([
      fetch("/api/sources"),
      fetch("/api/root-health")
    ]);
    setStatus((await stRes.json()) as SourcesStatus);

    try {
      const healthJson = (await healthRes.json()) as { roots: RootHealth[] };
      const map: Record<string, RootHealth> = {};
      for (const h of healthJson.roots) map[h.rootId] = h;
      setRootHealthMap(map);
    } catch {
      /* root-health endpoint may not be available yet */
    }
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

      const [stRes, healthRes] = await Promise.all([
        fetch("/api/sources"),
        fetch("/api/root-health")
      ]);
      setStatus((await stRes.json()) as SourcesStatus);

      try {
        const healthJson = (await healthRes.json()) as { roots: RootHealth[] };
        const map: Record<string, RootHealth> = {};
        for (const h of healthJson.roots) map[h.rootId] = h;
        setRootHealthMap(map);
      } catch {
        /* best-effort */
      }
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
    <div className="mx-auto max-w-[1200px] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold">Settings</div>
            <Badge title={configPath}>config.json</Badge>
          </div>
          {configPath ? (
            <div className="mt-1 truncate text-xs text-muted" title={configPath}>
              {configPath}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={saving}>
            Refresh
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Back</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-danger/55 bg-danger/10 px-3 py-2 text-sm text-danger">
          <span className="font-medium">Error:</span> {error}
        </div>
      ) : null}

      <Card className="mb-4 p-3">
        <div className="mb-2 text-sm font-semibold">Windsurf token override (fallback)</div>
        <div className="mb-3 text-xs text-muted">
          Attach mode prefers reading <span className="font-mono">--csrf_token</span> from the Windsurf LS process.
          If that fails on your system, you can paste the token here.
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            className="font-mono"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            value={config?.windsurf.csrfTokenOverride ?? ""}
            onChange={(e) => {
              if (!config) return;
              const next = cloneConfig(config);
              next.windsurf.csrfTokenOverride = e.target.value;
              setConfig(next);
            }}
          />
          <Button
            className="sm:shrink-0"
            variant="default"
            size="sm"
            disabled={!config || saving}
            onClick={() => config && save(config)}
          >
            Save
          </Button>
        </div>
      </Card>

      <Card className="mb-4 p-3">
        <div className="mb-2 text-sm font-semibold">Add root</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            className="sm:max-w-44"
            value={newSource}
            onChange={(e) => setNewSource(e.target.value as Source)}
          >
            <option value="antigravity">antigravity</option>
            <option value="windsurf">windsurf</option>
          </Select>
          <Input
            className="font-mono"
            placeholder="e.g. ~/.gemini/antigravity/conversations"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
          />
          <Button
            className="sm:shrink-0"
            variant="default"
            size="sm"
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
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-2 text-sm font-semibold">Antigravity roots</div>
          <div className="flex flex-col gap-2">
            {rootsBySource.antigravity.map((r) => (
              <RootRow
                key={r.id}
                root={r}
                health={rootHealthMap[r.id]}
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
            {rootsBySource.antigravity.length === 0 ? <div className="text-sm text-muted">No roots.</div> : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-2 text-sm font-semibold">Windsurf roots</div>
          <div className="flex flex-col gap-2">
            {rootsBySource.windsurf.map((r) => (
              <RootRow
                key={r.id}
                root={r}
                health={rootHealthMap[r.id]}
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
            {rootsBySource.windsurf.length === 0 ? <div className="text-sm text-muted">No roots.</div> : null}
          </div>
        </div>
      </div>

      <Card className="mt-4 p-3">
        <div className="mb-2 text-sm font-semibold">Diagnostics</div>
        <pre className={cn("m-0 max-w-full overflow-x-auto text-xs", "font-mono")}>
          {JSON.stringify(status, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
