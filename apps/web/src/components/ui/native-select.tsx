import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function NativeSelect(
  props: Omit<JSX.SelectHTMLAttributes<HTMLSelectElement>, "size"> & { size?: "sm" | "default" }
) {
  const [, rest] = splitProps(props, ["class", "ref", "size"]);
  return (
    <div
      data-slot="native-select-wrapper"
      data-size={props.size ?? "default"}
      class={cn("group/native-select relative w-fit has-[select:disabled]:opacity-50", props.class)}
    >
      <select
        ref={props.ref}
        data-slot="native-select"
        data-size={props.size ?? "default"}
        class="h-7 w-full min-w-0 appearance-none rounded-md border border-input bg-input/20 py-0.5 pr-6 pl-2 text-xs/relaxed transition-colors outline-none select-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 data-[size=sm]:h-6 data-[size=sm]:text-[0.625rem] dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        {...rest}
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="pointer-events-none absolute top-1/2 right-1.5 size-3.5 -translate-y-1/2 text-muted-foreground select-none group-data-[size=sm]/native-select:size-3 group-data-[size=sm]/native-select:-translate-y-[calc(--spacing(1.25))]"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

export function NativeSelectOption(props: JSX.OptionHTMLAttributes<HTMLOptionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <option
      ref={props.ref}
      data-slot="native-select-option"
      class={cn("bg-[Canvas] text-[CanvasText]", props.class)}
      {...rest}
    />
  );
}

export function NativeSelectOptGroup(props: JSX.OptgroupHTMLAttributes<HTMLOptGroupElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <optgroup
      ref={props.ref}
      data-slot="native-select-optgroup"
      class={cn("bg-[Canvas] text-[CanvasText]", props.class)}
      {...rest}
    />
  );
}
