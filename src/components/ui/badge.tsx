import * as React from "react";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm",
  {
    variants: {
      variant: {
        default: "border-border/80 bg-background/8 text-muted",
        ok: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
        warn: "border-amber-400/35 bg-amber-400/10 text-amber-200",
        bad: "border-danger/55 bg-danger/10 text-danger"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});

Badge.displayName = "Badge";
