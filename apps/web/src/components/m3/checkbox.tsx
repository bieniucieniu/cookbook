import type { JSX } from "@solidjs/web";
import {
  Checkbox as CheckboxPrimitive,
  CheckboxIndicator as CheckboxIndicatorPrimitive,
} from "@ui-sdk/solid/checkbox";
import { type ComponentProps } from "solid-js";
import { cn, partClass } from "@/lib/utils";

// ui-sdk's Checkbox is the box itself. `Checkbox` here is the `<label>` that lays out the box
// and its text; put `checked` / `onCheckedChange` on `CheckboxControl`.

export function Checkbox(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="checkbox"
      {...props}
      class={cn(
        "group/checkbox inline-flex items-center gap-4 text-on-surface has-data-disabled:cursor-not-allowed",
        props.class
      )}
    />
  );
}

/**
 * The 18px box. Its state layer is a 40px circle: on-surface while unchecked, primary while
 * checked, error while invalid. It renders its own indicator unless you pass children.
 */
export function CheckboxControl(props: ComponentProps<typeof CheckboxPrimitive>) {
  return (
    <CheckboxPrimitive
      {...props}
      class={partClass(
        "group/checkbox-control relative m-2.75 flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-[2px] border-2 border-on-surface-variant text-on-primary state-layer outline-none motion-fast [--state-layer-color:var(--md-sys-color-on-surface)] [--state-layer-inset:-13px] [--state-layer-radius:9999px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-secondary focus-visible:before:opacity-10 data-checked:border-primary data-checked:bg-primary data-checked:[--state-layer-color:var(--md-sys-color-primary)] data-indeterminate:border-primary data-indeterminate:bg-primary aria-invalid:border-error aria-invalid:[--state-layer-color:var(--md-sys-color-error)] aria-invalid:data-checked:bg-error aria-invalid:data-checked:text-on-error data-disabled:border-on-surface/38 data-disabled:data-checked:border-transparent data-disabled:data-checked:bg-on-surface/38 data-disabled:data-checked:text-surface",
        props.class
      )}
    >
      {(props.children as JSX.Element) ?? <CheckboxIndicator />}
    </CheckboxPrimitive>
  );
}

export function CheckboxIndicator(props: ComponentProps<typeof CheckboxIndicatorPrimitive>) {
  return (
    <CheckboxIndicatorPrimitive
      {...props}
      class={partClass(
        "grid place-content-center text-current transition-[scale] duration-150 data-starting-style:scale-50 [&>svg]:size-4.5",
        props.class
      )}
    >
      {(props.children as JSX.Element) ?? (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            class="group-data-indeterminate/checkbox-control:hidden"
            d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
          />
          <path
            class="hidden group-data-indeterminate/checkbox-control:block"
            d="M19 13H5v-2h14z"
          />
        </svg>
      )}
    </CheckboxIndicatorPrimitive>
  );
}

export function CheckboxLabel(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="checkbox-label"
      {...props}
      class={cn(
        "typescale-body-large text-on-surface select-none group-has-data-disabled/checkbox:text-on-surface/38",
        props.class
      )}
    />
  );
}

export function CheckboxDescription(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="checkbox-description"
      {...props}
      class={cn("typescale-body-small text-on-surface-variant", props.class)}
    />
  );
}

export function CheckboxErrorMessage(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="checkbox-error-message"
      {...props}
      class={cn("typescale-body-small text-error", props.class)}
    />
  );
}
