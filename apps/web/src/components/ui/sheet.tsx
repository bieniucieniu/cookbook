import { Dialog as SheetPrimitive, useDialogContext } from "@kobalte/core/dialog";
import { type ComponentProps, type JSX, Show, splitProps } from "solid-js";
import { type ButtonSize, type ButtonVariant, buttonVariants } from "./button";
import { cn } from "@/lib/utils";

type SheetProps = ComponentProps<typeof SheetPrimitive>;
type SheetOverlayProps = ComponentProps<typeof SheetPrimitive.Overlay>;
type SheetContentProps = ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
};
type SheetTitleProps = ComponentProps<typeof SheetPrimitive.Title>;
type SheetDescriptionProps = ComponentProps<typeof SheetPrimitive.Description>;
type SheetCloseButtonProps = ComponentProps<typeof SheetPrimitive.CloseButton> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Sheet(props: SheetProps) {
  return <SheetPrimitive {...props} />;
}

export function SheetOverlay(props: SheetOverlayProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SheetPrimitive.Overlay
      ref={props.ref}
      data-slot="sheet-overlay"
      class={cn(
        "fixed inset-0 z-50 bg-black/80 duration-300 ease-out supports-backdrop-filter:backdrop-blur-xs data-expanded:animate-in data-expanded:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        props.class
      )}
      {...rest}
    />
  );
}

export function SheetContent(props: SheetContentProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children", "side", "showCloseButton"]);
  return (
    <SheetPrimitive.Content
      ref={props.ref}
      data-slot="sheet-content"
      data-side={props.side ?? "right"}
      data-close-button={(props.showCloseButton ?? true) ? "" : undefined}
      class={cn(
        "fixed z-50 flex flex-col gap-4 bg-popover p-6 bg-clip-padding text-xs/relaxed text-popover-foreground shadow-lg transition ease-in-out outline-none data-expanded:duration-500 data-closed:duration-300 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm data-expanded:animate-in data-expanded:fade-in-0 data-[side=bottom]:data-expanded:slide-in-from-bottom-10 data-[side=left]:data-expanded:slide-in-from-left-10 data-[side=right]:data-expanded:slide-in-from-right-10 data-[side=top]:data-expanded:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 data-[side=bottom]:data-closed:slide-out-to-bottom-10 data-[side=left]:data-closed:slide-out-to-left-10 data-[side=right]:data-closed:slide-out-to-right-10 data-[side=top]:data-closed:slide-out-to-top-10",
        props.class
      )}
      {...rest}
    >
      {props.children}
      <Show when={props.showCloseButton ?? true}>
        <SheetPrimitive.CloseButton
          data-slot="sheet-close"
          class={buttonVariants({
            variant: "ghost",
            size: "icon-sm",
            class: "absolute top-4 right-4",
          })}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
          <span class="sr-only">Close</span>
        </SheetPrimitive.CloseButton>
      </Show>
    </SheetPrimitive.Content>
  );
}

export function SheetHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="sheet-header"
      class={cn("flex flex-col gap-1.5 in-data-close-button:pr-8", props.class)}
      {...rest}
    />
  );
}

export function SheetFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="sheet-footer"
      class={cn("mt-auto flex flex-col gap-2", props.class)}
      {...rest}
    />
  );
}

export function SheetTitle(props: SheetTitleProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SheetPrimitive.Title
      ref={props.ref}
      data-slot="sheet-title"
      class={cn("text-sm font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function SheetDescription(props: SheetDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SheetPrimitive.Description
      ref={props.ref}
      data-slot="sheet-description"
      class={cn("text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function SheetCloseButton(props: SheetCloseButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <SheetPrimitive.CloseButton
      ref={props.ref}
      data-slot="sheet-close"
      class={buttonVariants({
        variant: props.variant ?? "outline",
        size: props.size,
        class: props.class,
      })}
      {...rest}
    />
  );
}

export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetPortal = SheetPrimitive.Portal;

export { useDialogContext as useSheetContext };
