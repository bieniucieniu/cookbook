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
      class={cn(
        "group/checkbox inline-flex items-center gap-2 text-xs/relaxed text-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50",
        props.class
      )}
      {...rest}
    />
  );
}

export function CheckboxControl(props: CheckboxControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive.Control
      ref={props.ref}
      class={cn(
        "relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-shadow outline-none peer-focus-visible:border-ring peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30 data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/20 dark:bg-input/30 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:data-indeterminate:bg-primary",
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
      class={cn(
        "grid place-content-center text-current transition-none [&>svg]:size-3.5",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <Show when={state.indeterminate()} fallback={<path d="M20 6 9 17l-5-5" />}>
            <path d="M5 12h14" />
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
      class={cn(
        "text-xs/relaxed leading-none font-medium text-foreground select-none",
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
      class={cn("text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function CheckboxErrorMessage(props: CheckboxErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <CheckboxPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export function CheckboxInput(props: ComponentProps<typeof CheckboxPrimitive.Input>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <CheckboxPrimitive.Input ref={props.ref} class={cn("peer", props.class)} {...rest} />;
}
