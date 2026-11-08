import { Select as SelectPrimitive, useSelectContext } from "@kobalte/core/select";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type SelectProps = ComponentProps<typeof SelectPrimitive>;
type SelectTriggerProps = ComponentProps<typeof SelectPrimitive.Trigger>;
type SelectValueProps = ComponentProps<typeof SelectPrimitive.Value>;
type SelectIconProps = ComponentProps<typeof SelectPrimitive.Icon>;
type SelectContentProps = ComponentProps<typeof SelectPrimitive.Content>;
type SelectListboxProps = ComponentProps<typeof SelectPrimitive.Listbox>;
type SelectItemProps = ComponentProps<typeof SelectPrimitive.Item>;
type SelectItemLabelProps = ComponentProps<typeof SelectPrimitive.ItemLabel>;
type SelectItemDescriptionProps = ComponentProps<typeof SelectPrimitive.ItemDescription>;
type SelectItemIndicatorProps = ComponentProps<typeof SelectPrimitive.ItemIndicator>;
type SelectSectionProps = ComponentProps<typeof SelectPrimitive.Section>;
type SelectLabelProps = ComponentProps<typeof SelectPrimitive.Label>;
type SelectDescriptionProps = ComponentProps<typeof SelectPrimitive.Description>;
type SelectErrorMessageProps = ComponentProps<typeof SelectPrimitive.ErrorMessage>;

export function Select(props: SelectProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive
      gutter={4}
      ref={props.ref}
      class={cn(
        "flex flex-col gap-2 text-xs text-foreground data-disabled:opacity-50",
        props.class
      )}
      {...rest}
    />
  );
}

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
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

export function SelectTrigger(props: SelectTriggerProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <SelectPrimitive.Trigger
      ref={props.ref}
      class={cn(
        "flex h-7 w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-input/20 px-2 py-1.5 text-left text-xs/relaxed whitespace-nowrap transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        props.class
      )}
      {...rest}
    >
      {props.children}
      <SelectPrimitive.Icon class="pointer-events-none flex text-muted-foreground">
        <ChevronDownIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectValue(props: SelectValueProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Value
      ref={props.ref}
      class={cn(
        "line-clamp-1 flex flex-1 items-center gap-1.5 text-left data-placeholder-shown:text-muted-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export function SelectIcon(props: SelectIconProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Icon
      ref={props.ref}
      class={cn("size-3.5 shrink-0 text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function SelectContent(props: SelectContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Content
      ref={props.ref}
      class={cn(
        "relative z-50 max-h-(--kb-popper-content-available-height) min-w-[max(--spacing(32),var(--kb-popper-anchor-width))] origin-(--kb-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        props.class
      )}
      {...rest}
    />
  );
}

export function SelectListbox(props: SelectListboxProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Listbox
      ref={props.ref}
      class={cn("max-h-72 scroll-my-1 overflow-y-auto p-1 outline-none", props.class)}
      {...rest}
    />
  );
}

export function SelectItem(props: SelectItemProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <SelectPrimitive.Item
      ref={props.ref}
      class={cn(
        "relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-2 text-xs/relaxed outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        props.class
      )}
      {...rest}
    >
      {props.children}
      <SelectPrimitive.ItemIndicator class="pointer-events-none absolute right-2 flex items-center justify-center">
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectItemLabel(props: SelectItemLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.ItemLabel
      ref={props.ref}
      class={cn("text-xs/relaxed", props.class)}
      {...rest}
    />
  );
}

export function SelectItemDescription(props: SelectItemDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.ItemDescription
      ref={props.ref}
      class={cn("text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function SelectItemIndicator(props: SelectItemIndicatorProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <SelectPrimitive.ItemIndicator
      ref={props.ref}
      class={cn(
        "pointer-events-none absolute right-2 flex items-center justify-center",
        props.class
      )}
      {...rest}
    >
      {props.children ?? <CheckIcon />}
    </SelectPrimitive.ItemIndicator>
  );
}

export function SelectSection(props: SelectSectionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Section
      ref={props.ref}
      class={cn("px-2 py-1.5 text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function SelectLabel(props: SelectLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function SelectDescription(props: SelectDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.Description
      ref={props.ref}
      class={cn("text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function SelectErrorMessage(props: SelectErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SelectPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export const SelectPortal = SelectPrimitive.Portal;
export const SelectArrow = SelectPrimitive.Arrow;
export const SelectHiddenSelect = SelectPrimitive.HiddenSelect;

export { useSelectContext };
