import { Dialog as DrawerPrimitive, useDialogContext } from "@kobalte/core/dialog";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { type ButtonSize, type ButtonVariant, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

type DrawerProps = ComponentProps<typeof DrawerPrimitive>;
type DrawerOverlayProps = ComponentProps<typeof DrawerPrimitive.Overlay>;
type DrawerContentProps = ComponentProps<typeof DrawerPrimitive.Content>;
type DrawerTitleProps = ComponentProps<typeof DrawerPrimitive.Title>;
type DrawerDescriptionProps = ComponentProps<typeof DrawerPrimitive.Description>;
type DrawerCloseButtonProps = ComponentProps<typeof DrawerPrimitive.CloseButton> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Drawer(props: DrawerProps) {
  return <DrawerPrimitive {...props} />;
}

export function DrawerOverlay(props: DrawerOverlayProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DrawerPrimitive.Overlay
      ref={props.ref}
      data-slot="drawer-overlay"
      class={cn(
        "fixed inset-0 z-50 bg-black/80 duration-500 supports-backdrop-filter:backdrop-blur-xs data-expanded:animate-in data-expanded:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        props.class
      )}
      {...rest}
    />
  );
}

export function DrawerContent(props: DrawerContentProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <DrawerPrimitive.Content
      ref={props.ref}
      data-slot="drawer-content"
      class={cn(
        "group/drawer-content fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[80vh] flex-col gap-4 rounded-t-xl border-t border-border bg-popover px-4 pb-4 text-xs/relaxed text-popover-foreground duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none data-expanded:animate-in data-expanded:slide-in-from-bottom data-closed:animate-out data-closed:slide-out-to-bottom",
        props.class
      )}
      {...rest}
    >
      <div class="mx-auto mt-3 h-1.5 w-[100px] shrink-0 rounded-full bg-muted" />
      {props.children}
    </DrawerPrimitive.Content>
  );
}

export function DrawerHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="drawer-header"
      class={cn("flex flex-col gap-1 text-center md:text-left", props.class)}
      {...rest}
    />
  );
}

export function DrawerFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="drawer-footer"
      class={cn("mt-auto flex flex-col gap-2", props.class)}
      {...rest}
    />
  );
}

export function DrawerTitle(props: DrawerTitleProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DrawerPrimitive.Title
      ref={props.ref}
      data-slot="drawer-title"
      class={cn("text-sm font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function DrawerDescription(props: DrawerDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DrawerPrimitive.Description
      ref={props.ref}
      data-slot="drawer-description"
      class={cn("text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function DrawerCloseButton(props: DrawerCloseButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <DrawerPrimitive.CloseButton
      ref={props.ref}
      data-slot="drawer-close"
      class={buttonVariants({
        variant: props.variant ?? "outline",
        size: props.size,
        class: props.class,
      })}
      {...rest}
    />
  );
}

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerPortal = DrawerPrimitive.Portal;

export { useDialogContext as useDrawerContext };
