import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function ScrollArea(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <div
      data-slot="scroll-area"
      class={cn(
        "relative overflow-auto rounded-[inherit] [scrollbar-color:var(--border)_transparent] scrollbar-thin transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
        props.class
      )}
      {...rest}
    />
  );
}
