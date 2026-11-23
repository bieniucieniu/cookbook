import type { JSX } from "@solidjs/web";
import {
  Switch as SwitchPrimitive,
  SwitchThumb as SwitchThumbPrimitive,
} from "@ui-sdk/solid/switch";
import { type ComponentProps, Show, omit } from "solid-js";
import { cn, partClass } from "@/lib/utils";

// ui-sdk's Switch is the track. `Switch` here is the `<label>` that lays out the track and its
// text; put `checked` / `onCheckedChange` on `SwitchControl`.

export function Switch(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      data-slot="switch"
      {...props}
      class={cn(
        "group/switch inline-flex items-center gap-4 text-on-surface has-data-disabled:cursor-not-allowed",
        props.class
      )}
    />
  );
}

/**
 * The 52x32 track. Hover, focus, and press set the handle's state layer through --switch-layer.
 * It renders its own thumb unless you pass children.
 */
export function SwitchControl(props: ComponentProps<typeof SwitchPrimitive>) {
  return (
    <SwitchPrimitive
      {...props}
      class={partClass(
        "group/switch-control relative inline-flex h-8 w-13 shrink-0 cursor-pointer items-center rounded-full border-2 border-outline bg-surface-container-highest outline-none motion-fast [--switch-layer:0] hover:[--switch-layer:0.08] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-secondary focus-visible:[--switch-layer:0.1] active:[--switch-layer:0.1] data-checked:border-primary data-checked:bg-primary data-disabled:border-on-surface/12 data-disabled:bg-on-surface/12 data-disabled:[--switch-layer:0] data-disabled:data-checked:border-transparent",
        props.class
      )}
    >
      {(props.children as JSX.Element) ?? <SwitchThumb />}
    </SwitchPrimitive>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      class="hidden size-4 text-on-primary-container group-data-checked/switch-control:block"
    >
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      class="size-4 text-surface-container-highest group-data-checked/switch-control:hidden"
    >
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}

/**
 * The handle: 16px off, 24px on, 28px while pressed. It slides 20px between the two ends with the
 * fast spatial spring.
 */
export function SwitchThumb(
  props: ComponentProps<typeof SwitchThumbPrimitive> & {
    /** Show a check (on) and close (off) icon in the handle. The off handle grows to 24px. */
    icons?: boolean;
  }
) {
  const rest = omit(props, "icons");
  return (
    <SwitchThumbPrimitive
      data-icons={props.icons ? "" : undefined}
      {...rest}
      class={partClass(
        "pointer-events-none absolute top-1/2 left-3.5 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-outline motion-fast data-checked:size-6 data-checked:translate-x-[calc(-50%+20px)] data-checked:bg-on-primary data-icons:size-6 group-active/switch-control:size-7 group-data-disabled/switch-control:bg-on-surface/38 group-data-disabled/switch-control:data-checked:bg-surface",
        props.class
      )}
    >
      <span class="absolute size-10 rounded-full bg-on-surface opacity-(--switch-layer) motion-fast group-data-checked/switch-control:bg-primary" />
      <Show when={props.icons}>
        <span class="relative flex">
          <CheckIcon />
          <CloseIcon />
        </span>
      </Show>
    </SwitchThumbPrimitive>
  );
}

export function SwitchLabel(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="switch-label"
      {...props}
      class={cn(
        "typescale-body-large text-on-surface select-none group-has-data-disabled/switch:text-on-surface/38",
        props.class
      )}
    />
  );
}

export function SwitchDescription(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="switch-description"
      {...props}
      class={cn("typescale-body-small text-on-surface-variant", props.class)}
    />
  );
}

export function SwitchErrorMessage(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="switch-error-message"
      {...props}
      class={cn("typescale-body-small text-error", props.class)}
    />
  );
}
