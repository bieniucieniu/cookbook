import { DropdownMenu as DropdownMenuPrimitive } from "@kobalte/core/dropdown-menu";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const surfaceClass =
  "z-50 max-h-(--kb-popper-content-available-height) min-w-32 origin-(--kb-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95";
const itemClass =
  "group/menu-item relative flex min-h-7 cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 data-[variant=destructive]:*:[svg]:text-destructive";
const checkItemClass =
  "relative flex min-h-7 cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-xs outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5";
const subTriggerClass =
  "flex min-h-7 cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground data-expanded:bg-accent data-expanded:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5";

type DropdownMenuProps = ComponentProps<typeof DropdownMenuPrimitive>;
type DropdownMenuContentProps = ComponentProps<typeof DropdownMenuPrimitive.Content>;
type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  variant?: "default" | "destructive";
};
type DropdownMenuItemLabelProps = ComponentProps<typeof DropdownMenuPrimitive.ItemLabel>;
type DropdownMenuItemDescriptionProps = ComponentProps<
  typeof DropdownMenuPrimitive.ItemDescription
>;
type DropdownMenuItemIndicatorProps = ComponentProps<typeof DropdownMenuPrimitive.ItemIndicator>;
type DropdownMenuCheckboxItemProps = ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>;
type DropdownMenuRadioGroupProps = ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>;
type DropdownMenuRadioItemProps = ComponentProps<typeof DropdownMenuPrimitive.RadioItem>;
type DropdownMenuGroupProps = ComponentProps<typeof DropdownMenuPrimitive.Group>;
type DropdownMenuGroupLabelProps = ComponentProps<typeof DropdownMenuPrimitive.GroupLabel>;
type DropdownMenuIconProps = ComponentProps<typeof DropdownMenuPrimitive.Icon>;
type DropdownMenuSubTriggerProps = ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>;
type DropdownMenuSubContentProps = ComponentProps<typeof DropdownMenuPrimitive.SubContent>;
type DropdownMenuSeparatorProps = ComponentProps<typeof DropdownMenuPrimitive.Separator>;

export function DropdownMenu(props: DropdownMenuProps) {
  return <DropdownMenuPrimitive gutter={4} {...props} />;
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      class="size-3.5"
      fill="none"
      stroke="currentColor"
      stroke-width="3"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function DropdownMenuContent(props: DropdownMenuContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Content
      ref={props.ref}
      class={cn(surfaceClass, props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuItem(props: DropdownMenuItemProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant"]);
  return (
    <DropdownMenuPrimitive.Item
      ref={props.ref}
      data-variant={props.variant ?? "default"}
      class={cn(itemClass, props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuItemLabel(props: DropdownMenuItemLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.ItemLabel
      ref={props.ref}
      class={cn("text-xs text-foreground", props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuItemDescription(props: DropdownMenuItemDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.ItemDescription
      ref={props.ref}
      class={cn("text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuItemIndicator(props: DropdownMenuItemIndicatorProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <DropdownMenuPrimitive.ItemIndicator
      ref={props.ref}
      class={cn(
        "pointer-events-none absolute right-2 flex items-center justify-center",
        props.class
      )}
      {...rest}
    >
      {props.children ?? <CheckIcon />}
    </DropdownMenuPrimitive.ItemIndicator>
  );
}

export function DropdownMenuCheckboxItem(props: DropdownMenuCheckboxItemProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={props.ref}
      class={cn(checkItemClass, props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.RadioGroup
      ref={props.ref}
      class={cn("flex flex-col", props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuRadioItem(props: DropdownMenuRadioItemProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={props.ref}
      class={cn(checkItemClass, props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Group
      ref={props.ref}
      class={cn("flex flex-col", props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuGroupLabel(props: DropdownMenuGroupLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.GroupLabel
      ref={props.ref}
      class={cn("px-2 py-1.5 text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuIcon(props: DropdownMenuIconProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Icon
      ref={props.ref}
      class={cn("size-3.5 shrink-0 text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuSubTrigger(props: DropdownMenuSubTriggerProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={props.ref}
      class={cn(subTriggerClass, props.class)}
      {...rest}
    >
      {props.children}
      <svg
        viewBox="0 0 24 24"
        class="ml-auto"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </DropdownMenuPrimitive.SubTrigger>
  );
}

export function DropdownMenuSubContent(props: DropdownMenuSubContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.SubContent
      ref={props.ref}
      class={cn(surfaceClass, props.class)}
      {...rest}
    />
  );
}

export function DropdownMenuSeparator(props: DropdownMenuSeparatorProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DropdownMenuPrimitive.Separator
      ref={props.ref}
      class={cn(
        "-mx-1 my-1 h-px bg-border/50 data-[orientation=vertical]:mx-0 data-[orientation=vertical]:my-0 data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-px",
        props.class
      )}
      {...rest}
    />
  );
}

export function DropdownMenuShortcut(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <span
      ref={props.ref}
      data-slot="dropdown-menu-shortcut"
      class={cn(
        "ml-auto text-[0.625rem] tracking-widest text-muted-foreground group-data-highlighted/menu-item:text-accent-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
export const DropdownMenuArrow = DropdownMenuPrimitive.Arrow;
export const DropdownMenuSub = DropdownMenuPrimitive.Sub;
