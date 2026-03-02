import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-offset-black",
  {
    variants: {
      variant: {
        default:
          "border border-accent bg-accent text-white hover:-translate-y-0.5 hover:bg-blue-700",
        secondary:
          "border border-neutral-300 bg-white text-neutral-900 hover:-translate-y-0.5 hover:border-accent hover:text-accent dark:border-white/20 dark:bg-black dark:text-white",
        ghost:
          "text-neutral-700 hover:bg-neutral-100 hover:text-accent dark:text-neutral-200 dark:hover:bg-white/10"
      },
      size: {
        default: "h-11 px-6 py-2",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
