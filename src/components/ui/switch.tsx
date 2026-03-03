import * as React from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = {
  checked: boolean;
  onCheckedChange(checked: boolean): void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
};

export function Switch(props: SwitchProps) {
  const { checked, onCheckedChange, disabled, className, id } = props;
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={props["aria-label"]}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-background/10 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-50",
        checked && "border-accent/35 bg-accent/20",
        className
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 translate-x-0.5 rounded-full bg-foreground/80 shadow transition-transform",
          checked && "translate-x-[1.125rem] bg-foreground"
        )}
      />
    </button>
  );
}

