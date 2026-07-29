import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      />
    );
  },
);
Select.displayName = "Select";
