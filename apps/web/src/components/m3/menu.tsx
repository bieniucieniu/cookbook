import {
  Menu as MenuRootPrimitive,
  MenuCheckboxItem as MenuCheckboxItemPrimitive,
  MenuContent as MenuContentPrimitive,
  MenuGroup as MenuGroupPrimitive,
  MenuGroupLabel as MenuGroupLabelPrimitive,
  MenuItem as MenuItemPrimitive,
  MenuItemIndicator as MenuItemIndicatorPrimitive,
  MenuRadioGroup as MenuRadioGroupPrimitive,
  MenuRadioItem as MenuRadioItemPrimitive,
  MenuSeparator as MenuSeparatorPrimitive,
  MenuSub as MenuSubPrimitive,
  MenuSubContent as MenuSubContentPrimitive,
  MenuSubTrigger as MenuSubTriggerPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
} from "@ui-sdk/solid/menu";
import { type JSX } from "@solidjs/web";
import { type ComponentProps } from "solid-js";
import { cn, partClass } from "@/lib/utils";

const surfaceClass =
  "z-50 flex max-h-(--available-height) min-w-28 max-w-70 origin-(--transform-origin) flex-col gap-0.5 overflow-y-auto rounded-large bg-surface-container p-1 text-on-surface shadow-level-2 outline-none transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0";

const itemClass =
  "group/menu-item relative flex min-h-11 cursor-pointer items-center gap-3 rounded-medium px-3 py-2 typescale-label-large text-on-surface outline-none select-none state-layer motion-fast data-disabled:pointer-events-none data-disabled:text-on-surface/38 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5";

/** Checked items fill with the tertiary container (M3 Expressive selected item). */
const selectableItemClass =
  "data-checked:bg-tertiary-container data-checked:text-on-tertiary-container data-checked:rounded-large";

type MenuProps = ComponentProps<typeof MenuRootPrimitive>;
type MenuContentProps = ComponentProps<typeof MenuContentPrimitive>;
type MenuItemProps = ComponentProps<typeof MenuItemPrimitive>;
type MenuItemLabelProps = JSX.HTMLAttributes<HTMLSpanElement>;
type MenuItemDescriptionProps = JSX.HTMLAttributes<HTMLSpanElement>;
type MenuItemIndicatorProps = ComponentProps<typeof MenuItemIndicatorPrimitive>;
type MenuCheckboxItemProps = ComponentProps<typeof MenuCheckboxItemPrimitive>;
type MenuRadioGroupProps = ComponentProps<typeof MenuRadioGroupPrimitive>;
type MenuRadioItemProps = ComponentProps<typeof MenuRadioItemPrimitive>;
type MenuGroupProps = ComponentProps<typeof MenuGroupPrimitive>;
type MenuGroupLabelProps = ComponentProps<typeof MenuGroupLabelPrimitive>;
type MenuSubTriggerProps = ComponentProps<typeof MenuSubTriggerPrimitive>;
type MenuSubContentProps = ComponentProps<typeof MenuSubContentPrimitive>;
type MenuSeparatorProps = ComponentProps<typeof MenuSeparatorPrimitive>;

export function Menu(props: MenuProps) {
  return <MenuRootPrimitive {...props} />;
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
  return (
    <MenuContentPrimitive
      sideOffset={4}
      {...props}
      class={partClass(() => cn(surfaceClass), props.class)}
    />
  );
}

export function MenuItem(props: MenuItemProps) {
  return <MenuItemPrimitive {...props} class={partClass(() => cn(itemClass), props.class)} />;
}

/** Leading icon slot, in on-surface-variant. */
export function MenuItemIcon(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="menu-item-icon"
      {...props}
      class={cn(
        "flex shrink-0 text-on-surface-variant group-data-checked/menu-item:text-on-tertiary-container group-data-disabled/menu-item:text-on-surface/38",
        props.class
      )}
    />
  );
}

/** Labels a MenuItem, MenuCheckboxItem, or MenuRadioItem. In MenuSubTrigger use a plain span. */
export function MenuItemLabel(props: MenuItemLabelProps) {
  return <span data-slot="menu-item-label" {...props} class={cn("flex-1 truncate", props.class)} />;
}

export function MenuItemDescription(props: MenuItemDescriptionProps) {
  return (
    <span
      data-slot="menu-item-description"
      {...props}
      class={cn("typescale-body-small text-on-surface-variant", props.class)}
    />
  );
}

export function MenuItemIndicator(props: MenuItemIndicatorProps) {
  return (
    <MenuItemIndicatorPrimitive
      {...props}
      class={partClass(() => cn("ml-auto flex shrink-0"), props.class)}
    >
      {props.children ?? <CheckIcon />}
    </MenuItemIndicatorPrimitive>
  );
}

/** Trailing text such as a keyboard shortcut. */
export function MenuShortcut(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="menu-shortcut"
      {...props}
      class={cn("ml-auto typescale-label-large text-on-surface-variant", props.class)}
    />
  );
}

export function MenuCheckboxItem(props: MenuCheckboxItemProps) {
  return (
    <MenuCheckboxItemPrimitive
      {...props}
      class={partClass(() => cn(itemClass, selectableItemClass), props.class)}
    />
  );
}

export function MenuRadioGroup(props: MenuRadioGroupProps) {
  return (
    <MenuRadioGroupPrimitive
      {...props}
      class={partClass(() => cn("flex flex-col gap-0.5"), props.class)}
    />
  );
}

export function MenuRadioItem(props: MenuRadioItemProps) {
  return (
    <MenuRadioItemPrimitive
      {...props}
      class={partClass(() => cn(itemClass, selectableItemClass), props.class)}
    />
  );
}

export function MenuGroup(props: MenuGroupProps) {
  return (
    <MenuGroupPrimitive
      {...props}
      class={partClass(() => cn("flex flex-col gap-0.5"), props.class)}
    />
  );
}

export function MenuGroupLabel(props: MenuGroupLabelProps) {
  return (
    <MenuGroupLabelPrimitive
      {...props}
      class={partClass(
        () => cn("px-3 pt-2 pb-1 typescale-label-medium text-on-surface-variant"),
        props.class
      )}
    />
  );
}

export function MenuSubTrigger(props: MenuSubTriggerProps) {
  return (
    <MenuSubTriggerPrimitive
      {...props}
      class={partClass(() => cn(itemClass, "data-open:bg-on-surface/8"), props.class)}
    >
      {props.children}
      <ChevronRightIcon />
    </MenuSubTriggerPrimitive>
  );
}

export function MenuSubContent(props: MenuSubContentProps) {
  return (
    <MenuSubContentPrimitive {...props} class={partClass(() => cn(surfaceClass), props.class)} />
  );
}

export function MenuSeparator(props: MenuSeparatorProps) {
  return (
    <MenuSeparatorPrimitive
      {...props}
      class={partClass(() => cn("mx-3 my-1 h-px border-none bg-outline-variant"), props.class)}
    />
  );
}

export const MenuTrigger = MenuTriggerPrimitive;
export const MenuSub = MenuSubPrimitive;
