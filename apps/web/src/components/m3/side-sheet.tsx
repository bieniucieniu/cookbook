import DialogPrimitive, {
  type CloseProps,
  type ContentProps,
  type DescriptionProps,
  type DynamicProps,
  type LabelProps,
  type OverlayProps,
  type RootProps,
} from "@corvu/dialog";
import { type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

/** Modal side sheet (corvu dialog). */
export function SideSheet(props: RootProps) {
  return <DialogPrimitive {...props} />;
}

export function SideSheetOverlay(props: DynamicProps<"div", OverlayProps>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DialogPrimitive.Overlay
      ref={props.ref}
      data-slot="side-sheet-overlay"
      class={cn(
        "fixed inset-0 z-50 bg-scrim/32 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        props.class
      )}
      {...rest}
    />
  );
}

const sideClasses = {
  end: "right-0 rounded-s-large data-open:slide-in-from-right data-closed:slide-out-to-right",
  start: "left-0 rounded-e-large data-open:slide-in-from-left data-closed:slide-out-to-left",
};

/** Up to 400px wide, 16px corners on the inner edge. */
export function SideSheetContent(
  props: DynamicProps<"div", ContentProps> & { side?: "start" | "end" }
) {
  const [, rest] = splitProps(props, ["class", "ref", "side"]);
  return (
    <DialogPrimitive.Content
      ref={props.ref}
      data-slot="side-sheet-content"
      class={cn(
        "fixed inset-y-0 z-50 flex w-[calc(100%-3.5rem)] max-w-100 flex-col bg-surface-container-low text-on-surface shadow-level-1 outline-none data-open:animate-in data-open:duration-500 data-open:ease-default-spatial data-closed:animate-out data-closed:duration-200",
        sideClasses[props.side ?? "end"],
        props.class
      )}
      {...rest}
    />
  );
}

export function SideSheetHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="side-sheet-header"
      class={cn("flex min-h-18 shrink-0 items-center gap-2 pr-3 pl-6", props.class)}
      {...rest}
    />
  );
}

export function SideSheetTitle(props: DynamicProps<"h2", LabelProps>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DialogPrimitive.Label
      ref={props.ref}
      data-slot="side-sheet-title"
      class={cn("flex-1 typescale-title-large text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function SideSheetDescription(props: DynamicProps<"p", DescriptionProps>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <DialogPrimitive.Description
      ref={props.ref}
      data-slot="side-sheet-description"
      class={cn("px-6 typescale-body-medium text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

export function SideSheetBody(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="side-sheet-body"
      class={cn("min-h-0 flex-1 overflow-y-auto px-6 py-2", props.class)}
      {...rest}
    />
  );
}

/** Bottom action row with a divider above it. */
export function SideSheetActions(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="side-sheet-actions"
      class={cn(
        "flex shrink-0 items-center gap-2 border-t border-outline-variant px-6 pt-4 pb-6",
        props.class
      )}
      {...rest}
    />
  );
}

/** Icon close button for the header. Shows a close icon unless given children. */
export function SideSheetClose(props: DynamicProps<"button", CloseProps>) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <DialogPrimitive.Close
      ref={props.ref}
      data-slot="side-sheet-close"
      aria-label="Close"
      class={cn(
        "relative flex size-10 cursor-pointer items-center justify-center rounded-full text-on-surface-variant state-layer focus-ring [&_svg]:size-6",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      )}
    </DialogPrimitive.Close>
  );
}

export const SideSheetTrigger = DialogPrimitive.Trigger;
export const SideSheetPortal = DialogPrimitive.Portal;
export const useSideSheetContext = DialogPrimitive.useContext;
