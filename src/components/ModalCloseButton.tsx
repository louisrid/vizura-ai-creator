import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const ModalCloseButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", style, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={props["aria-label"] ?? "close"}
      className={cn(
        "absolute right-0 top-0 z-[999] flex h-8 w-8 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full shadow-lg transition-opacity hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
        className,
      )}
      style={{
        backgroundColor: "hsl(var(--card))",
        border: "2px solid hsl(var(--foreground) / 0.25)",
        color: "hsl(var(--foreground))",
        ...style,
      }}
      {...props}
    >
      <X size={16} strokeWidth={3} />
      <span className="sr-only">Close</span>
    </button>
  ),
);

ModalCloseButton.displayName = "ModalCloseButton";

export default ModalCloseButton;