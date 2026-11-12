import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const surfaceClass =
  "z-50 flex max-h-(--kb-popper-content-available-height) min-w-28 max-w-70 origin-(--kb-menu-content-transform-origin) flex-col gap-0.5 overflow-y-auto rounded-large bg-surface-container p-1 text-on-surface shadow-level-2 outline-none data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";

const itemClass =
  "group/menu-item relative flex min-h-11 cursor-pointer items-center gap-3 rounded-medium px-3 py-2 typescale-label-large text-on-surface outline-none select-none state-layer motion-fast data-disabled:pointer-events-none data-disabled:text-on-surface/38 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5";

/** Checked items fill with the tertiary container (M3 Expressive selected item). */
const selectableItemClass =
  "data-checked:bg-tertiary-container data-checked:text-on-tertiary-container data-checked:rounded-large";

type MenuProps = ComponentProps<typeof DropdownMenuPrimitive>;
type MenuContentProps = ComponentProps<typeof DropdownMenuPrimitive.Content>;
type MenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item>;
type MenuItemLabelProps = ComponentProps<typeof DropdownMenuPrimitive.ItemLabel>;
type MenuItemDescriptionProps = ComponentProps<typeof DropdownMenuPrimitive.ItemDescription>;
type MenuItemIndicatorProps = ComponentProps<typeof DropdownMenuPrimitive.ItemIndicator>;
type MenuCheckboxItemProps = ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>;
type MenuRadioGroupProps = ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>;
type MenuRadioItemProps = ComponentProps<typeof DropdownMenuPrimitive.RadioItem>;
type MenuGroupProps = ComponentProps<typeof DropdownMenuPrimitive.Group>;
type MenuGroupLabelProps = ComponentProps<typeof DropdownMenuPrimitive.GroupLabel>;
type MenuSubTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>;
type MenuSubContentProps = ComponentProps<typeof DropdownMenuPrimitive.SubContent>;
type MenuSeparatorProps = ComponentProps<typeof DropdownMenuPrimitive.Separator>;

export function Menu(props: MenuProps) {
  return <DropdownMenuPrimitive gutter={4} {...props} />;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="ml-auto">
      <path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
    </svg>
  );
}

export function MenuContent(props: MenuContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Content
      ref={props.ref}
      data-slot="menu-content"
      class={cn(surfaceClass, props.class)}
      {...rest}
    />
  );
}

export function MenuItem(props: MenuItemProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Item
      ref={props.ref}
      data-slot="menu-item"
      class={cn(itemClass, props.class)}
      {...rest}
    />
  );
}

/** Leading icon slot, in on-surface-variant. */
export function MenuItemIcon(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="menu-item-icon"
      class={cn(
        "flex shrink-0 text-on-surface-variant group-data-checked/menu-item:text-on-tertiary-container group-data-disabled/menu-item:text-on-surface/38",
        props.class
      )}
      {...rest}
    />
  );
}

/** Labels a MenuItem, MenuCheckboxItem, or MenuRadioItem. In MenuSubTrigger use a plain span. */
export function MenuItemLabel(props: MenuItemLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.ItemLabel
      ref={props.ref}
      data-slot="menu-item-label"
      class={cn("flex-1 truncate", props.class)}
      {...rest}
    />
  );
}

export function MenuItemDescription(props: MenuItemDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.ItemDescription
      ref={props.ref}
      data-slot="menu-item-description"
      class={cn("typescale-body-small text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function MenuItemIndicator(props: MenuItemIndicatorProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <DropdownMenuPrimitive.ItemIndicator
      ref={props.ref}
      data-slot="menu-item-indicator"
      class={cn("ml-auto flex shrink-0", props.class)}
      {...rest}
    >
      {props.children ?? <CheckIcon />}
    </DropdownMenuPrimitive.ItemIndicator>
  );
}

/** Trailing text such as a keyboard shortcut. */
export function MenuShortcut(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="menu-shortcut"
      class={cn("ml-auto typescale-label-large text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function MenuCheckboxItem(props: MenuCheckboxItemProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={props.ref}
      data-slot="menu-checkbox-item"
      class={cn(itemClass, selectableItemClass, props.class)}
      {...rest}
    />
  );
}

export function MenuRadioGroup(props: MenuRadioGroupProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.RadioGroup
      ref={props.ref}
      data-slot="menu-radio-group"
      class={cn("flex flex-col gap-0.5", props.class)}
      {...rest}
    />
  );
}

export function MenuRadioItem(props: MenuRadioItemProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={props.ref}
      data-slot="menu-radio-item"
      class={cn(itemClass, selectableItemClass, props.class)}
      {...rest}
    />
  );
}

export function MenuGroup(props: MenuGroupProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Group
      ref={props.ref}
      data-slot="menu-group"
      class={cn("flex flex-col gap-0.5", props.class)}
      {...rest}
    />
  );
}

export function MenuGroupLabel(props: MenuGroupLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.GroupLabel
      ref={props.ref}
      data-slot="menu-group-label"
      class={cn("px-3 pt-2 pb-1 typescale-label-medium text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function MenuSubTrigger(props: MenuSubTriggerProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={props.ref}
      data-slot="menu-sub-trigger"
      class={cn(itemClass, "data-expanded:bg-on-surface/8", props.class)}
      {...rest}
    >
      {props.children}
      <ChevronRightIcon />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function MenuSubContent(props: MenuSubContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.SubContent
      ref={props.ref}
      data-slot="menu-sub-content"
      class={cn(surfaceClass, props.class)}
      {...rest}
    />
  );
}

export function MenuSeparator(props: MenuSeparatorProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Separator
      ref={props.ref}
      data-slot="menu-separator"
      class={cn("mx-3 my-1 h-px border-none bg-outline-variant", props.class)}
      {...rest}
    />
  );
}

export const MenuTrigger = DropdownMenuPrimitive.Trigger;
export const MenuPortal = DropdownMenuPrimitive.Portal;
export const MenuSub = DropdownMenuPrimitive.Sub;
