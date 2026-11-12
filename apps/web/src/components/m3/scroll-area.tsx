import { type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

/**
 * A native scroll container with a thin outline-colored scrollbar. Scrolling stops at its
 * edges instead of chaining to the page. Give it a bounded size (`max-h-*`, or `min-h-0
 * flex-1` inside a flex column).
 */
export function ScrollArea(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="scroll-area"
      class={cn(
        "relative overflow-auto overscroll-contain [scrollbar-color:var(--md-sys-color-outline)_transparent] [scrollbar-width:thin] outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-secondary",
        props.class
      )}
      {...rest}
    />
  );
}
