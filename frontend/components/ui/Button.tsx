import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "success" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:opacity-80",
  destructive: "bg-destructive text-destructive-foreground shadow hover:opacity-90",
  success: "bg-emerald-600 text-white shadow hover:bg-emerald-700",
  ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  outline: "border border-border bg-transparent hover:bg-accent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function buttonVariants(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, loading = false, disabled, children, ...props }, ref) => {
    return (
      <button ref={ref} className={buttonVariants(variant, size, className)} disabled={disabled || loading} {...props}>
        {loading && <Spinner className="mr-2" />}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
