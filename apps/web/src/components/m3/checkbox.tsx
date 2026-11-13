import { Checkbox as CheckboxPrimitive, useCheckboxContext } from "@kobalte/core/checkbox";
import { type ComponentProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type CheckboxProps = ComponentProps<typeof CheckboxPrimitive>;
type CheckboxControlProps = ComponentProps<typeof CheckboxPrimitive.Control>;
type CheckboxIndicatorProps = ComponentProps<typeof CheckboxPrimitive.Indicator>;
type CheckboxLabelProps = ComponentProps<typeof CheckboxPrimitive.Label>;
type CheckboxDescriptionProps = ComponentProps<typeof CheckboxPrimitive.Description>;
type CheckboxErrorMessageProps = ComponentProps<typeof CheckboxPrimitive.ErrorMessage>;

export function Checkbox(props: CheckboxProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive
      ref={props.ref}
      data-slot="checkbox"
      class={cn(
        "group/checkbox inline-flex items-center gap-4 text-on-surface data-disabled:cursor-not-allowed",
        props.class
      )}
      {...rest}
    />
  );
}

/**
 * The 18px box. Its state layer is a 40px circle: on-surface while unchecked, primary while
 * checked, error while invalid.
 */
export function CheckboxControl(props: CheckboxControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive.Control
      ref={props.ref}
      data-slot="checkbox-control"
      class={cn(
        "relative m-2.75 flex size-4.5 shrink-0 cursor-pointer items-center justify-center rounded-[2px] border-2 border-on-surface-variant text-on-primary state-layer motion-fast [--state-layer-color:var(--md-sys-color-on-surface)] [--state-layer-inset:-13px] [--state-layer-radius:9999px] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-secondary peer-focus-visible:before:opacity-10 data-checked:border-primary data-checked:bg-primary data-checked:[--state-layer-color:var(--md-sys-color-primary)] data-indeterminate:border-primary data-indeterminate:bg-primary data-invalid:border-error data-invalid:[--state-layer-color:var(--md-sys-color-error)] data-invalid:data-checked:bg-error data-invalid:data-checked:text-on-error data-disabled:border-on-surface/38 data-disabled:data-checked:border-transparent data-disabled:data-checked:bg-on-surface/38 data-disabled:data-checked:text-surface",
        props.class
      )}
      {...rest}
    />
  );
}

export function CheckboxIndicator(props: CheckboxIndicatorProps) {
  const state = useCheckboxContext();
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <CheckboxPrimitive.Indicator
      ref={props.ref}
      data-slot="checkbox-indicator"
      class={cn(
        "grid place-content-center text-current data-checked:animate-in data-checked:zoom-in-50 [&>svg]:size-4.5",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <Show
            when={state.indeterminate()}
            fallback={<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />}
          >
            <path d="M6 11h12v2H6z" />
          </Show>
        </svg>
      )}
    </CheckboxPrimitive.Indicator>
  );
}

export function CheckboxLabel(props: CheckboxLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive.Label
      ref={props.ref}
      data-slot="checkbox-label"
      class={cn(
        "typescale-body-large text-on-surface select-none data-disabled:text-on-surface/38",
        props.class
      )}
      {...rest}
    />
  );
}

export function CheckboxDescription(props: CheckboxDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive.Description
      ref={props.ref}
      data-slot="checkbox-description"
      class={cn("typescale-body-small text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function CheckboxErrorMessage(props: CheckboxErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive.ErrorMessage
      ref={props.ref}
      data-slot="checkbox-error-message"
      class={cn("typescale-body-small text-error", props.class)}
      {...rest}
    />
  );
}

export function CheckboxInput(props: ComponentProps<typeof CheckboxPrimitive.Input>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <CheckboxPrimitive.Input ref={props.ref} class={cn("peer", props.class)} {...rest} />;
}
