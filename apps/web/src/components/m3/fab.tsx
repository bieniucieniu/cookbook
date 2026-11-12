import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const fabBase =
  "group/fab relative inline-flex shrink-0 cursor-pointer items-center justify-center select-none state-layer focus-ring motion-fast shadow-level-3 hover:shadow-level-4 disabled:pointer-events-none disabled:bg-on-surface/10 disabled:text-on-surface/38 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0";

/** Tonal FABs sit on the container colors; the others use the solid accent. */
const fabVariantClasses = {
  "tonal-primary": "bg-primary-container text-on-primary-container",
  "tonal-secondary": "bg-secondary-container text-on-secondary-container",
  "tonal-tertiary": "bg-tertiary-container text-on-tertiary-container",
  primary: "bg-primary text-on-primary",
  secondary: "bg-secondary text-on-secondary",
  tertiary: "bg-tertiary text-on-tertiary",
};

/** FAB (56), medium FAB (80), large FAB (96). */
const fabSizeClasses = {
  default: "size-14 rounded-large [&_svg:not([class*='size-'])]:size-6",
  md: "size-20 rounded-large-increased [&_svg:not([class*='size-'])]:size-7",
  lg: "size-24 rounded-extra-large [&_svg:not([class*='size-'])]:size-9",
};

const extendedFabSizeClasses = {
  default:
    "h-14 min-w-20 gap-2 rounded-large px-4 typescale-title-medium [&_svg:not([class*='size-'])]:size-6",
  md: "h-20 min-w-20 gap-3 rounded-large-increased px-6.5 typescale-title-large [&_svg:not([class*='size-'])]:size-7",
  lg: "h-24 min-w-24 gap-4 rounded-extra-large px-7 typescale-headline-small [&_svg:not([class*='size-'])]:size-9",
};

export type FabVariant = keyof typeof fabVariantClasses;
export type FabSize = keyof typeof fabSizeClasses;

export function fabVariants(options?: {
  variant?: FabVariant;
  size?: FabSize;
  extended?: boolean;
  class?: string;
}) {
  const size = options?.size ?? "default";
  return cn(
    fabBase,
    fabVariantClasses[options?.variant ?? "tonal-primary"],
    options?.extended ? extendedFabSizeClasses[size] : fabSizeClasses[size],
    options?.class
  );
}

export interface FabProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: FabVariant;
  size?: FabSize;
}

/** Floating action button for the screen's primary action. Give it an `aria-label`. */
export function Fab(props: FabProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="fab"
      data-variant={props.variant ?? "tonal-primary"}
      data-size={props.size ?? "default"}
      class={fabVariants({ variant: props.variant, size: props.size, class: props.class })}
      {...rest}
    />
  );
}

/** FAB with a text label next to the icon. */
export function ExtendedFab(props: FabProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="extended-fab"
      data-variant={props.variant ?? "tonal-primary"}
      data-size={props.size ?? "default"}
      class={fabVariants({
        variant: props.variant,
        size: props.size,
        extended: true,
        class: props.class,
      })}
      {...rest}
    />
  );
}
