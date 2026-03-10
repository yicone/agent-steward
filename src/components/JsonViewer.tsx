"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonArray = JsonValue[];

/** How many items/keys a node may have before it starts collapsed. */
const AUTO_COLLAPSE_THRESHOLD = 5;

function CopyButton({ getValue }: { getValue: () => string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getValue());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };
  return (
    <button
      type="button"
      className="ml-1 hidden select-none rounded px-0.5 text-[10px] text-muted opacity-60 hover:opacity-100 group-hover:inline"
      onClick={handleClick}
      title="Copy value"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

function JsonNodeContent({ value, depth }: { value: JsonValue; depth: number }) {
  const isObject = value !== null && typeof value === "object";
  const isArray = Array.isArray(value);
  const entries: [string, JsonValue][] = isObject
    ? isArray
      ? (value as JsonValue[]).map((v, i) => [String(i), v])
      : Object.entries(value as JsonObject)
    : [];

  const [expanded, setExpanded] = useState(
    !isObject || entries.length <= AUTO_COLLAPSE_THRESHOLD
  );

  useEffect(() => {
    setExpanded(!isObject || entries.length <= AUTO_COLLAPSE_THRESHOLD);
  }, [value, isObject, entries.length]);

  // Primitive
  if (!isObject) {
    const primitive = value as JsonPrimitive;
    let cls = "text-muted";
    if (primitive === null) cls = "text-slate-400 dark:text-slate-500";
    else if (typeof primitive === "boolean") cls = "text-purple-600 dark:text-purple-400";
    else if (typeof primitive === "number") cls = "text-amber-600 dark:text-amber-400";
    else cls = "text-emerald-700 dark:text-emerald-400";
    const display = primitive === null ? "null" : JSON.stringify(primitive);
    const titleAttr =
      typeof primitive === "string" && primitive.length > 0
        ? primitive.length > 200
          ? primitive.slice(0, 200) + "…"
          : primitive
        : undefined;
    return (
      <span className={cn("font-mono", cls)} title={titleAttr}>
        {display}
      </span>
    );
  }

  const open = isArray ? "[" : "{";
  const close = isArray ? "]" : "}";

  if (entries.length === 0) {
    return <span className="font-mono text-muted">{open}{close}</span>;
  }

  return (
    <>
      <button
        type="button"
        className="inline select-none font-mono text-muted hover:text-foreground focus:outline-none"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {expanded ? "▾" : "▸"}
      </button>
      {expanded ? (
        <>
          <span className="font-mono text-muted">{open}</span>
          <div className="ml-4 border-l border-border/40 pl-2">
            {entries.map(([k, v], i) => (
              <div key={k} className="group leading-[1.6]">
                {!isArray && (
                  <>
                    <span className="font-mono text-sky-700 dark:text-sky-400">{JSON.stringify(k)}</span>
                    <span className="font-mono text-muted">: </span>
                  </>
                )}
                <JsonNodeContent value={v} depth={depth + 1} />
                {i < entries.length - 1 && <span className="font-mono text-muted">,</span>}
                {(v === null || typeof v !== "object") && (
                  <CopyButton getValue={() => (v === null ? "null" : typeof v === "string" ? v : JSON.stringify(v))} />
                )}
              </div>
            ))}
          </div>
          <span className="font-mono text-muted">{close}</span>
        </>
      ) : (
        <button
          type="button"
          className="font-mono text-muted hover:text-foreground"
          onClick={() => setExpanded(true)}
          title="Click to expand"
        >
          {open}&hellip;{close}{" "}
          <span className="text-[10px]">({entries.length})</span>
        </button>
      )}
    </>
  );
}

/**
 * Collapsible JSON tree viewer.
 *
 * Accepts either a pre-parsed value or a JSON string.
 * Falls back to a plain `<pre>` block when the input is not valid JSON.
 */
export function JsonViewer({ data, className }: { data: unknown; className?: string }) {
  let parsed: JsonValue;
  try {
    parsed = (typeof data === "string" ? JSON.parse(data) : (data as JsonValue));
    // Guard against plain primitives passed as the root – still show them.
    if (parsed !== null && typeof parsed !== "object" && typeof data !== "string") {
      parsed = data as JsonValue;
    }
  } catch {
    return (
      <pre
        className={cn(
          "mt-1 rounded border border-border bg-background/20 p-2 text-xs font-mono whitespace-pre-wrap break-words",
          className
        )}
      >
        {String(data)}
      </pre>
    );
  }

  return (
    <div
      className={cn(
        "mt-1 rounded border border-border bg-background/20 p-2 text-xs overflow-x-auto",
        className
      )}
    >
      <JsonNodeContent value={parsed} depth={0} />
    </div>
  );
}
