import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onKeyDown, ...props }, ref) => {
    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      // Prevent native arrow up/down behavior from changing numeric inputs
      if (type === "number" && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        return;
      }

      // When Enter is pressed, move focus to the next visible, focusable control within the same form
      if (e.key === "Enter") {
        try {
          const el = e.currentTarget as HTMLElement;
          const form = el.closest("form");
          if (form) {
            const selector = 'input, textarea, select, button, [tabindex]:not([tabindex="-1"])';
            const nodes = Array.from(form.querySelectorAll<HTMLElement>(selector));
            const candidates = nodes.filter((n) => {
              if (n === el) return true; // include current so index resolves properly
              if ((n as HTMLInputElement).hasAttribute("disabled")) return false;
              const t = (n as HTMLInputElement).getAttribute("type");
              if (t === "hidden") return false;
              const style = window.getComputedStyle(n);
              if (style.display === "none" || style.visibility === "hidden") return false;
              return true;
            });

            const idx = candidates.indexOf(el);
            if (idx >= 0 && idx < candidates.length - 1) {
              const next = candidates[idx + 1];
              next.focus();
              e.preventDefault();
              return;
            }
          }
        } catch (err) {
          // ignore non-browser contexts
        }
      }

      if (onKeyDown) onKeyDown(e as any);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
