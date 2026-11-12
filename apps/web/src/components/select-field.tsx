import { cn } from "@/lib/utils";
import { type JSX, splitProps } from "solid-js";

/**
 * A native select drawn as an M3 outlined text field with its label always raised. M3's exposed
 * dropdown is a text field plus a menu; the native control keeps the platform picker on phones
 * and needs no extra primitive. Set `--text-field-notch` on a parent that is not `surface`.
 */
export function SelectField(
  props: JSX.SelectHTMLAttributes<HTMLSelectElement> & { label: string; containerClass?: string }
) {
  const [, rest] = splitProps(props, ["label", "class", "containerClass", "children"]);
  return (
    <label class={cn("group/select relative flex min-w-0 flex-col", props.containerClass)}>
      <span class="pointer-events-none absolute -top-2 left-3 z-10 max-w-[calc(100%-2rem)] truncate bg-(--text-field-notch,var(--md-sys-color-surface)) px-1 typescale-body-small text-on-surface-variant group-focus-within/select:text-primary">
        {props.label}
      </span>
      <select
        class={cn(
          "h-14 w-full min-w-0 cursor-pointer appearance-none rounded-extra-small bg-transparent py-0 pr-10 pl-4 typescale-body-large text-on-surface ring-1 ring-outline outline-none ring-inset motion-fast hover:ring-on-surface focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:text-on-surface/38 disabled:ring-on-surface/12",
          props.class
        )}
        {...rest}
      >
        {props.children}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 right-3 size-6 -translate-y-1/2 text-on-surface-variant"
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>
    </label>
  );
}
