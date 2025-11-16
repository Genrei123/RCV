import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/utils/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent app-bg-primary text-white hover:opacity-90",
        secondary:
          "border-transparent app-bg-secondary text-white hover:opacity-90",
        destructive:
          "border-transparent app-bg-error text-white hover:opacity-90",
        outline: "text-foreground",
        success:
          "border-transparent app-bg-success text-white hover:opacity-90",
        warning:
          "border-transparent app-bg-secondary text-white hover:opacity-90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
