import { ElementType, HTMLAttributes } from "react";
import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  dashed?: boolean;
  as?: ElementType;
}

export function Card({ dashed = false, as: Component = "div", className, ...props }: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-lg border p-4",
        dashed
          ? "border-dashed border-border bg-card/50 text-center text-sm text-muted-foreground"
          : "border-border bg-card shadow-sm",
        className,
      )}
      {...props}
    />
  );
}
