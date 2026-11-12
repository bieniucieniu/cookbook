import { Switch as SwitchPrimitive } from "@kobalte/core/switch";
import { type ComponentProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type SwitchProps = ComponentProps<typeof SwitchPrimitive>;
type SwitchControlProps = ComponentProps<typeof SwitchPrimitive.Control>;
type SwitchThumbProps = ComponentProps<typeof SwitchPrimitive.Thumb> & {
  /** Show a check (on) and close (off) icon in the handle. The off handle grows to 24px. */
  icons?: boolean;
};
type SwitchLabelProps = ComponentProps<typeof SwitchPrimitive.Label>;
type SwitchDescriptionProps = ComponentProps<typeof SwitchPrimitive.Description>;
type SwitchErrorMessageProps = ComponentProps<typeof SwitchPrimitive.ErrorMessage>;

export function Switch(props: SwitchProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive
      ref={props.ref}
      data-slot="switch"
      class={cn(
        "group/switch inline-flex items-center gap-4 text-on-surface data-disabled:cursor-not-allowed",
        props.class
      )}
      {...rest}
    />
  );
}

/** The 52x32 track. Hover, focus, and press set the handle's state layer through --switch-layer. */
export function SwitchControl(props: SwitchControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Control
      ref={props.ref}
      data-slot="switch-control"
      class={cn(
        "group/switch-control relative inline-flex h-8 w-13 shrink-0 cursor-pointer items-center rounded-full border-2 border-outline bg-surface-container-highest motion-fast [--switch-layer:0] hover:[--switch-layer:0.08] active:[--switch-layer:0.1] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary peer-focus-visible:[--switch-layer:0.1] data-checked:border-primary data-checked:bg-primary data-disabled:border-on-surface/12 data-disabled:bg-on-surface/12 data-disabled:[--switch-layer:0] data-disabled:data-checked:border-transparent",
        props.class
      )}
      {...rest}
    />
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
export function SwitchThumb(props: SwitchThumbProps) {
  const [, rest] = splitProps(props, ["class", "ref", "icons", "children"]);
  return (
    <SwitchPrimitive.Thumb
      ref={props.ref}
      data-slot="switch-thumb"
      data-icons={props.icons ? "" : undefined}
      class={cn(
        "pointer-events-none absolute top-1/2 left-3.5 flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-outline motion-fast data-checked:translate-x-[calc(-50%+20px)] data-checked:size-6 data-checked:bg-on-primary data-icons:size-6 group-active/switch-control:size-7 group-data-disabled/switch-control:bg-on-surface/38 group-data-disabled/switch-control:data-checked:bg-surface",
        props.class
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        class="absolute size-10 rounded-full bg-on-surface opacity-(--switch-layer) motion-fast group-data-checked/switch-control:bg-primary"
      />
      <Show when={props.icons}>
        <span class="relative flex">
          <CheckIcon />
          <CloseIcon />
        </span>
      </Show>
    </SwitchPrimitive.Thumb>
  );
}

export function SwitchLabel(props: SwitchLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Label
      ref={props.ref}
      data-slot="switch-label"
      class={cn(
        "typescale-body-large text-on-surface select-none data-disabled:text-on-surface/38",
        props.class
      )}
      {...rest}
    />
  );
}

export function SwitchDescription(props: SwitchDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Description
      ref={props.ref}
      data-slot="switch-description"
      class={cn("typescale-body-small text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function SwitchErrorMessage(props: SwitchErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.ErrorMessage
      ref={props.ref}
      data-slot="switch-error-message"
      class={cn("typescale-body-small text-error", props.class)}
      {...rest}
    />
  );
}

export function SwitchInput(props: ComponentProps<typeof SwitchPrimitive.Input>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <SwitchPrimitive.Input ref={props.ref} class={cn("peer", props.class)} {...rest} />;
}
