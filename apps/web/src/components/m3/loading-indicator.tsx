import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export interface LoadingIndicatorProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Put the shape on a primary-container circle. */
  contained?: boolean;
}

/**
 * Indeterminate wait of under five seconds: a shape that morphs and turns. Give it an
 * `aria-label`.
 */
export function LoadingIndicator(props: LoadingIndicatorProps) {
  const [, rest] = splitProps(props, ["class", "ref", "contained"]);
  return (
    <span
      ref={props.ref}
      role="progressbar"
      aria-busy="true"
      data-slot="loading-indicator"
      data-contained={props.contained ? "" : undefined}
      class={cn(
        "group/loading inline-flex size-12 shrink-0 items-center justify-center rounded-full data-contained:bg-primary-container",
        props.class
      )}
      {...rest}
    >
      <span class="size-9.5 animate-m3-morph bg-primary group-data-contained/loading:size-8 group-data-contained/loading:bg-on-primary-container motion-reduce:animate-none" />
    </span>
  );
}
