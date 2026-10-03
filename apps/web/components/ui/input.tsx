import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-2xl border border-neutral-300 bg-white px-4 py-2 text-sm outline-hidden transition placeholder:text-neutral-400 focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-white/20 dark:bg-black dark:placeholder:text-neutral-500",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
