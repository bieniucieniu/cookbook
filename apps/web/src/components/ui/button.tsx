import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <button
      ref={props.ref}
      class={cn(
        "inline-flex h-7 items-center justify-center gap-1 rounded-md border border-transparent bg-primary bg-clip-padding px-2 text-xs/relaxed font-medium text-primary-foreground hover:bg-primary/80 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-3.5",
        props.class
      )}
      {...rest}
    />
  );
}
