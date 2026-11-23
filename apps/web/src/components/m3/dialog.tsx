import {
  Dialog as DialogRootPrimitive,
  DialogClose as DialogClosePrimitive,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogBackdrop as DialogBackdropPrimitive,
  DialogTrigger as DialogTriggerPrimitive,
} from "@ui-sdk/solid/dialog";
import { type JSX } from "@solidjs/web";
import { type ComponentProps, omit } from "solid-js";
import { type ButtonSize, type ButtonVariant, buttonVariants } from "./button";
import { cn, partClass } from "@/lib/utils";

export function Dialog(props: ComponentProps<typeof DialogRootPrimitive>) {
  return <DialogRootPrimitive {...props} />;
}

/** The scrim: 32% scrim color over the page. */
export function DialogOverlay(props: ComponentProps<typeof DialogBackdropPrimitive>) {
  return (
    <DialogBackdropPrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "fixed inset-0 z-50 bg-scrim/32 transition-opacity duration-200 data-ending-style:duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0"
          ),
        props.class
      )}
    />
  );
}

export function DialogContent(
  props: ComponentProps<typeof DialogContentPrimitive> & {
    /** Fill the window: no corners, surface background, header row at the top. */
    fullScreen?: boolean;
  }
) {
  const rest = omit(props, "fullScreen");
  return (
    <DialogContentPrimitive
      data-full-screen={props.fullScreen ? "" : undefined}
      {...rest}
      class={partClass(
        () =>
          cn(
            "group/dialog fixed z-50 flex flex-col text-on-surface outline-none",
            props.fullScreen
              ? "m-0 inset-0 h-full max-h-none w-full max-w-none bg-surface transition-[opacity,translate] duration-300 data-ending-style:duration-200 data-starting-style:translate-y-8 data-starting-style:opacity-0 data-ending-style:translate-y-8 data-ending-style:opacity-0"
              : "top-1/2 left-1/2 max-h-[calc(100%-3rem)] w-[calc(100%-3rem)] max-w-140 min-w-70 -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-extra-large bg-surface-container-high p-6 shadow-level-3 medium:w-auto m-0 transition-[opacity,scale] duration-300 ease-default-spatial data-ending-style:duration-150 data-starting-style:scale-90 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"
          ),
        props.class
      )}
    />
  );
}

/** Optional hero icon above the headline. Centers the headline when present. */
export function DialogIcon(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="dialog-icon"
      {...props}
      class={cn(
        "flex justify-center text-secondary [&_svg:not([class*='size-'])]:size-6",
        props.class
      )}
    />
  );
}

/** Top row of a full-screen dialog: close button, headline, and a confirm action. */
export function DialogHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-header"
      {...props}
      class={cn(
        "flex h-14 shrink-0 items-center gap-1 px-1 [&>[data-slot=dialog-title]]:flex-1 [&>[data-slot=dialog-title]]:typescale-title-large",
        props.class
      )}
    />
  );
}

export function DialogHeadline(props: ComponentProps<typeof DialogTitlePrimitive>) {
  return (
    <DialogTitlePrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "typescale-headline-small text-on-surface group-has-data-[slot=dialog-icon]/dialog:text-center"
          ),
        props.class
      )}
    />
  );
}

export function DialogDescription(props: ComponentProps<typeof DialogDescriptionPrimitive>) {
  return (
    <DialogDescriptionPrimitive
      {...props}
      class={partClass(
        () =>
          cn("typescale-body-medium text-on-surface-variant group-data-full-screen/dialog:px-6"),
        props.class
      )}
    />
  );
}

/** Scrollable body for longer content, such as a list. */
export function DialogBody(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-body"
      {...props}
      class={cn(
        "min-h-0 flex-1 overflow-y-auto typescale-body-medium text-on-surface-variant group-data-full-screen/dialog:px-6",
        props.class
      )}
    />
  );
}

export function DialogActions(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="dialog-actions"
      {...props}
      class={cn("flex flex-wrap items-center justify-end gap-2 pt-2", props.class)}
    />
  );
}

/** Closes the dialog. A text button by default. */
export function DialogClose(
  props: ComponentProps<typeof DialogClosePrimitive> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
) {
  const rest = omit(props, "variant", "size");
  return (
    <DialogClosePrimitive
      {...rest}
      class={partClass(
        () => buttonVariants({ variant: props.variant ?? "text", size: props.size }),
        props.class
      )}
    />
  );
}

export function DialogTrigger(props: ComponentProps<typeof DialogTriggerPrimitive>) {
  return <DialogTriggerPrimitive {...props} />;
}
export function DialogCloseButton(props: ComponentProps<typeof DialogClosePrimitive>) {
  return <DialogClosePrimitive {...props} />;
}
