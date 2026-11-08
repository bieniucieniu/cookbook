import { Combobox as ComboboxPrimitive, useComboboxContext } from "@kobalte/core/combobox";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type ComboboxTriggerProps = ComponentProps<typeof ComboboxPrimitive.Trigger>;
type ComboboxProps = ComponentProps<typeof ComboboxPrimitive>;
type ComboboxControlProps = ComponentProps<typeof ComboboxPrimitive.Control>;
type ComboboxInputProps = ComponentProps<typeof ComboboxPrimitive.Input>;
type ComboboxIconProps = ComponentProps<typeof ComboboxPrimitive.Icon>;
type ComboboxContentProps = ComponentProps<typeof ComboboxPrimitive.Content>;
type ComboboxListboxProps = ComponentProps<typeof ComboboxPrimitive.Listbox>;
type ComboboxItemProps = ComponentProps<typeof ComboboxPrimitive.Item>;
type ComboboxItemLabelProps = ComponentProps<typeof ComboboxPrimitive.ItemLabel>;
type ComboboxItemDescriptionProps = ComponentProps<typeof ComboboxPrimitive.ItemDescription>;
type ComboboxItemIndicatorProps = ComponentProps<typeof ComboboxPrimitive.ItemIndicator>;
type ComboboxSectionProps = ComponentProps<typeof ComboboxPrimitive.Section>;
type ComboboxLabelProps = ComponentProps<typeof ComboboxPrimitive.Label>;
type ComboboxDescriptionProps = ComponentProps<typeof ComboboxPrimitive.Description>;
type ComboboxErrorMessageProps = ComponentProps<typeof ComboboxPrimitive.ErrorMessage>;

export function Combobox(props: ComboboxProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive
      gutter={6}
      ref={props.ref}
      class={cn(
        "flex flex-col gap-2 text-xs text-foreground data-disabled:opacity-50",
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
      class="size-3.5"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function ComboboxControl(props: ComboboxControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Control
      ref={props.ref}
      class={cn(
        "flex h-7 w-full min-w-0 items-center rounded-md border border-input bg-input/20 bg-clip-padding text-xs/relaxed transition-colors outline-none focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 data-disabled:opacity-50 data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/20 dark:bg-input/30 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40",
        props.class
      )}
      {...rest}
    />
  );
}

export function ComboboxInput(props: ComboboxInputProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Input
      ref={props.ref}
      class={cn(
        "h-full min-w-0 flex-1 bg-transparent px-2 py-0.5 text-xs/relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        props.class
      )}
      {...rest}
    />
  );
}

export function ComboboxIcon(props: ComboboxIconProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Icon
      ref={props.ref}
      class={cn("size-3.5 shrink-0 text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function ComboboxContent(props: ComboboxContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Content
      ref={props.ref}
      class={cn(
        "relative z-50 max-h-(--kb-popper-content-available-height) min-w-(--kb-popper-anchor-width) origin-(--kb-combobox-content-transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        props.class
      )}
      {...rest}
    />
  );
}

export function ComboboxListbox(props: ComboboxListboxProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Listbox
      ref={props.ref}
      class={cn(
        "max-h-72 scroll-py-1 overflow-y-auto overscroll-contain p-1 outline-none",
        props.class
      )}
      {...rest}
    />
  );
}

export function ComboboxItem(props: ComboboxItemProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <ComboboxPrimitive.Item
      ref={props.ref}
      class={cn(
        "relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-2 text-xs/relaxed outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        props.class
      )}
      {...rest}
    >
      {props.children}
      <ComboboxPrimitive.ItemIndicator class="pointer-events-none absolute right-2 flex items-center justify-center">
        <CheckIcon />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export function ComboboxItemLabel(props: ComboboxItemLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.ItemLabel
      ref={props.ref}
      class={cn("text-xs/relaxed", props.class)}
      {...rest}
    />
  );
}

export function ComboboxItemDescription(props: ComboboxItemDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.ItemDescription
      ref={props.ref}
      class={cn("text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function ComboboxItemIndicator(props: ComboboxItemIndicatorProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <ComboboxPrimitive.ItemIndicator
      ref={props.ref}
      class={cn(
        "pointer-events-none absolute right-2 flex items-center justify-center",
        props.class
      )}
      {...rest}
    >
      {props.children ?? <CheckIcon />}
    </ComboboxPrimitive.ItemIndicator>
  );
}

export function ComboboxSection(props: ComboboxSectionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Section
      ref={props.ref}
      class={cn("px-2 py-1.5 text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function ComboboxLabel(props: ComboboxLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function ComboboxDescription(props: ComboboxDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.Description
      ref={props.ref}
      class={cn("text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function ComboboxErrorMessage(props: ComboboxErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ComboboxPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export function ComboboxTrigger(props: ComboboxTriggerProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <ComboboxPrimitive.Trigger
      ref={props.ref}
      data-slot="combobox-trigger"
      class={cn(
        "mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-3.5",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <ComboboxPrimitive.Icon class="flex">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </ComboboxPrimitive.Icon>
      )}
    </ComboboxPrimitive.Trigger>
  );
}
export const ComboboxPortal = ComboboxPrimitive.Portal;
export const ComboboxArrow = ComboboxPrimitive.Arrow;
export const ComboboxHiddenSelect = ComboboxPrimitive.HiddenSelect;

export { useComboboxContext };
