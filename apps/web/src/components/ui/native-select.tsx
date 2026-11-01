import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function NativeSelect(props: JSX.SelectHTMLAttributes<HTMLSelectElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <select
      ref={props.ref}
      class={cn(
        "h-7 w-full min-w-0 appearance-none rounded-md border border-input bg-input/20 py-0.5 pr-6 pl-2 text-xs/relaxed text-foreground transition-colors select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
        props.class
      )}
      {...rest}
    />
  );
}
