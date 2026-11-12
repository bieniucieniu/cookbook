import { Toast as ToastPrimitive, type ToastComponent, toaster } from "@kobalte/core/toast";
import { type ComponentProps, type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

/** Snackbars live in their own Kobalte toast region, apart from any other toasts on the page. */
export const SNACKBAR_REGION = "m3-snackbar";

type SnackbarProps = ComponentProps<typeof ToastPrimitive>;
type SnackbarRegionProps = ComponentProps<typeof ToastPrimitive.Region>;
type SnackbarListProps = ComponentProps<typeof ToastPrimitive.List>;
type SnackbarMessageProps = ComponentProps<typeof ToastPrimitive.Description>;
type SnackbarCloseProps = ComponentProps<typeof ToastPrimitive.CloseButton>;

/**
 * Shows, updates, and dismisses snackbars. `show` renders into SnackbarRegion; pass a function
 * that returns a Snackbar with the given `toastId`.
 */
export const snackbar = {
  show: (render: ToastComponent) => toaster.show(render, { region: SNACKBAR_REGION }),
  update: (id: number, render: ToastComponent) => toaster.update(id, render),
  dismiss: (id: number) => toaster.dismiss(id),
  clear: () => toaster.clear(),
};

/** Mount once. Snackbars stack bottom-center. */
export function SnackbarRegion(props: SnackbarRegionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ToastPrimitive.Region
      ref={props.ref}
      regionId={SNACKBAR_REGION}
      limit={1}
      data-slot="snackbar-region"
      class={cn(
        "fixed bottom-0 left-1/2 z-50 flex w-full max-w-150 -translate-x-1/2 flex-col p-4 outline-none",
        props.class
      )}
      {...rest}
    />
  );
}

export function SnackbarList(props: SnackbarListProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ToastPrimitive.List
      ref={props.ref}
      data-slot="snackbar-list"
      class={cn("flex w-full flex-col gap-2 outline-none", props.class)}
      {...rest}
    />
  );
}

/** One snackbar: inverse surface, a message, and an optional action and close button. */
export function Snackbar(props: SnackbarProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ToastPrimitive
      ref={props.ref}
      data-slot="snackbar"
      class={cn(
        "pointer-events-auto flex min-h-12 w-full items-center gap-1 rounded-extra-small bg-inverse-surface py-1 pr-2 pl-4 text-inverse-on-surface shadow-level-3 data-opened:animate-in data-opened:fade-in-0 data-opened:slide-in-from-bottom-4 data-opened:duration-300 data-opened:ease-default-spatial data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150 data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full data-[swipe=move]:translate-x-(--kb-toast-swipe-move-x) data-[swipe=move]:transition-none",
        props.class
      )}
      {...rest}
    />
  );
}

export function SnackbarMessage(props: SnackbarMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ToastPrimitive.Description
      ref={props.ref}
      data-slot="snackbar-message"
      class={cn("flex-1 py-2.5 typescale-body-medium text-inverse-on-surface", props.class)}
      {...rest}
    />
  );
}

/** Text action in inverse-primary. Dismiss the snackbar from its handler if it should close. */
export function SnackbarAction(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="snackbar-action"
      class={cn(
        "relative inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full px-3 typescale-label-large text-inverse-primary state-layer focus-ring",
        props.class
      )}
      {...rest}
    />
  );
}

export function SnackbarClose(props: SnackbarCloseProps) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <ToastPrimitive.CloseButton
      ref={props.ref}
      data-slot="snackbar-close"
      aria-label="Dismiss"
      class={cn(
        "relative flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-inverse-on-surface state-layer focus-ring [&_svg]:size-6",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      )}
    </ToastPrimitive.CloseButton>
  );
}
