import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

/**
 * small: one 64px row. medium / large: the headline moves to its own row under the icons, in
 * headline-medium or display-small.
 */
const appBarVariantClasses = {
  small: "min-h-16",
  medium: "min-h-28",
  large: "min-h-30",
};

export type AppBarVariant = keyof typeof appBarVariantClasses;

export interface AppBarProps extends JSX.HTMLAttributes<HTMLElement> {
  variant?: AppBarVariant;
  /** Content scrolls under the bar: switch to the surface-container color. */
  scrolled?: boolean;
  /** Center the headline (small only). */
  centered?: boolean;
}

/** Top app bar. Children: AppBarLeading, AppBarHeadline, AppBarTrailing. */
export function AppBar(props: AppBarProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "scrolled", "centered"]);
  return (
    <header
      ref={props.ref}
      data-slot="app-bar"
      data-variant={props.variant ?? "small"}
      data-scrolled={props.scrolled ? "" : undefined}
      data-centered={props.centered ? "" : undefined}
      class={cn(
        "group/app-bar grid w-full grid-cols-[auto_minmax(0,1fr)_auto] content-start items-center bg-surface px-1 text-on-surface motion-default data-scrolled:bg-surface-container",
        appBarVariantClasses[props.variant ?? "small"],
        props.class
      )}
      {...rest}
    />
  );
}

/** Navigation icon button (menu, back). */
export function AppBarLeading(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="app-bar-leading"
      class={cn(
        "col-start-1 row-start-1 flex h-16 items-center gap-1 px-1 text-on-surface",
        props.class
      )}
      {...rest}
    />
  );
}

/** Action icon buttons or an avatar. */
export function AppBarTrailing(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="app-bar-trailing"
      class={cn(
        "col-start-3 row-start-1 flex h-16 items-center justify-end gap-1 px-1 text-on-surface-variant",
        props.class
      )}
      {...rest}
    />
  );
}

/** Holds AppBarTitle and an optional AppBarSubtitle. */
export function AppBarHeadline(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="app-bar-headline"
      class={cn(
        "flex min-w-0 flex-col justify-center group-data-[variant=small]/app-bar:col-start-2 group-data-[variant=small]/app-bar:row-start-1 group-data-[variant=small]/app-bar:px-1 group-data-centered/app-bar:items-center group-data-centered/app-bar:text-center group-data-[variant=large]/app-bar:col-span-3 group-data-[variant=large]/app-bar:row-start-2 group-data-[variant=large]/app-bar:px-3 group-data-[variant=large]/app-bar:pb-3 group-data-[variant=medium]/app-bar:col-span-3 group-data-[variant=medium]/app-bar:row-start-2 group-data-[variant=medium]/app-bar:px-3 group-data-[variant=medium]/app-bar:pb-3",
        props.class
      )}
      {...rest}
    />
  );
}

export function AppBarTitle(props: JSX.HTMLAttributes<HTMLHeadingElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <h1
      ref={props.ref}
      data-slot="app-bar-title"
      class={cn(
        "truncate typescale-title-large text-on-surface group-data-[variant=large]/app-bar:typescale-display-small group-data-[variant=medium]/app-bar:typescale-headline-medium",
        props.class
      )}
      {...rest}
    />
  );
}

export function AppBarSubtitle(props: JSX.HTMLAttributes<HTMLParagraphElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <p
      ref={props.ref}
      data-slot="app-bar-subtitle"
      class={cn(
        "truncate typescale-label-medium text-on-surface-variant group-data-[variant=large]/app-bar:typescale-title-medium group-data-[variant=medium]/app-bar:typescale-label-large",
        props.class
      )}
      {...rest}
    />
  );
}
