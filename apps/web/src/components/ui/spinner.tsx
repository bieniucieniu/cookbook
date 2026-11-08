import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function Spinner(props: JSX.SvgSVGAttributes<SVGSVGElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <svg
      ref={props.ref}
      role="status"
      aria-label="Loading"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class={cn("size-4 shrink-0 animate-spin", props.class)}
      {...rest}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
