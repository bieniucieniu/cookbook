import { AlertDialog as AlertDialogPrimitive } from "@kobalte/core/alert-dialog";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { type ButtonSize, type ButtonVariant, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

type AlertDialogProps = ComponentProps<typeof AlertDialogPrimitive>;
type AlertDialogOverlayProps = ComponentProps<typeof AlertDialogPrimitive.Overlay>;
type AlertDialogContentProps = ComponentProps<typeof AlertDialogPrimitive.Content> & {
  size?: "default" | "sm";
};
type AlertDialogTitleProps = ComponentProps<typeof AlertDialogPrimitive.Title>;
type AlertDialogDescriptionProps = ComponentProps<typeof AlertDialogPrimitive.Description>;
type AlertDialogCloseButtonProps = ComponentProps<typeof AlertDialogPrimitive.CloseButton> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function AlertDialog(props: AlertDialogProps) {
  return <AlertDialogPrimitive {...props} />;
}

export function AlertDialogOverlay(props: AlertDialogOverlayProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <AlertDialogPrimitive.Overlay
      ref={props.ref}
      data-slot="alert-dialog-overlay"
      class={cn(
        "fixed inset-0 z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-expanded:animate-in data-expanded:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogContent(props: AlertDialogContentProps) {
  const [, rest] = splitProps(props, ["class", "ref", "size"]);
  return (
    <AlertDialogPrimitive.Content
      ref={props.ref}
      data-slot="alert-dialog-content"
      data-size={props.size ?? "default"}
      class={cn(
        "group/alert-dialog-content fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-3 rounded-xl bg-popover p-4 text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none data-[size=default]:max-w-xs data-[size=sm]:max-w-64 data-[size=default]:sm:max-w-sm data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert-dialog-header"
      class={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert-dialog-footer"
      class={cn(
        "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogMedia(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert-dialog-media"
      class={cn(
        "mb-2 inline-flex size-8 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-4",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogTitle(props: AlertDialogTitleProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <AlertDialogPrimitive.Title
      ref={props.ref}
      data-slot="alert-dialog-title"
      class={cn(
        "text-sm font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogDescription(props: AlertDialogDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <AlertDialogPrimitive.Description
      ref={props.ref}
      data-slot="alert-dialog-description"
      class={cn(
        "text-xs/relaxed text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDialogCloseButton(props: AlertDialogCloseButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <AlertDialogPrimitive.CloseButton
      ref={props.ref}
      data-slot="alert-dialog-close"
      class={buttonVariants({
        variant: props.variant ?? "outline",
        size: props.size,
        class: props.class,
      })}
      {...rest}
    />
  );
}

export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;
