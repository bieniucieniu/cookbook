import { Popover as PopoverPrimitive, usePopoverContext } from "@kobalte/core/popover";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { type ButtonSize, type ButtonVariant, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

type PopoverProps = ComponentProps<typeof PopoverPrimitive>;
type PopoverContentProps = ComponentProps<typeof PopoverPrimitive.Content>;
type PopoverTitleProps = ComponentProps<typeof PopoverPrimitive.Title>;
type PopoverDescriptionProps = ComponentProps<typeof PopoverPrimitive.Description>;
type PopoverCloseButtonProps = ComponentProps<typeof PopoverPrimitive.CloseButton> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Popover(props: PopoverProps) {
  return <PopoverPrimitive gutter={4} {...props} />;
}

export function PopoverContent(props: PopoverContentProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <PopoverPrimitive.Content
      ref={props.ref}
      class={cn(
        "z-50 flex w-72 origin-(--kb-popover-content-transform-origin) flex-col gap-4 rounded-lg bg-popover p-2.5 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-hidden data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        props.class
      )}
      {...rest}
    />
  );
}

export function PopoverHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="popover-header"
      class={cn("flex flex-col gap-1 text-xs", props.class)}
      {...rest}
    />
  );
}

export function PopoverTitle(props: PopoverTitleProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <PopoverPrimitive.Title
      ref={props.ref}
      class={cn("text-sm font-medium", props.class)}
      {...rest}
    />
  );
}

export function PopoverDescription(props: PopoverDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <PopoverPrimitive.Description
      ref={props.ref}
      class={cn("text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function PopoverCloseButton(props: PopoverCloseButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <PopoverPrimitive.CloseButton
      ref={props.ref}
      class={buttonVariants({
        variant: props.variant ?? "outline",
        size: props.size,
        class: props.class,
      })}
      {...rest}
    />
  );
}

export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverPortal = PopoverPrimitive.Portal;
export const PopoverArrow = PopoverPrimitive.Arrow;

export { usePopoverContext };
