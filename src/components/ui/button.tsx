import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px]",
  {
    variants: {
      variant: {
        default:
          "border-accent/35 bg-gradient-to-b from-accent/18 to-accent/10 text-foreground hover:border-accent/55 hover:from-accent/22 hover:to-accent/12",
        outline:
          "border-border/80 bg-background/8 text-foreground hover:border-accent/35 hover:bg-background/12",
        ghost: "border-transparent bg-transparent text-foreground hover:bg-background/10",
        destructive:
          "border-danger/55 bg-gradient-to-b from-danger/18 to-danger/10 text-danger hover:border-danger/70 hover:from-danger/22 hover:to-danger/12"
      },
      size: {
        default: "h-9",
        sm: "h-8 px-2 text-xs",
        lg: "h-10 px-4"
      }
    },
    defaultVariants: {
      variant: "outline",
      size: "default"
    }
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
