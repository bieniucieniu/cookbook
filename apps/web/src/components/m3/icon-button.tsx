import { ToggleButton as ToggleButtonPrimitive } from "@kobalte/core/toggle-button";
import type { ComponentProps, JSX } from "solid-js";
import { splitProps } from "solid-js";
import {
  type ButtonShape,
  type ButtonSize,
  buttonShapeClasses,
  outlineWidthClass,
  useButtonGroupStyle,
} from "./button";
import { cn } from "@/lib/utils";

const iconButtonBase =
  "group/icon-button relative inline-flex shrink-0 cursor-pointer items-center justify-center select-none state-layer focus-ring motion-fast disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0";

const iconButtonVariantClasses = {
  standard: "text-on-surface-variant disabled:text-on-surface/38",
  filled: "bg-primary text-on-primary disabled:bg-on-surface/10 disabled:text-on-surface/38",
  tonal:
    "bg-secondary-container text-on-secondary-container disabled:bg-on-surface/10 disabled:text-on-surface/38",
  outlined:
    "border border-outline-variant text-on-surface-variant disabled:border-on-surface/12 disabled:text-on-surface/38",
};

const toggleIconButtonVariantClasses = {
  standard: "text-on-surface-variant data-pressed:text-primary disabled:text-on-surface/38",
  filled:
    "bg-surface-container text-on-surface-variant data-pressed:bg-primary data-pressed:text-on-primary disabled:bg-on-surface/10 disabled:text-on-surface/38",
  tonal:
    "bg-secondary-container text-on-secondary-container data-pressed:bg-secondary data-pressed:text-on-secondary disabled:bg-on-surface/10 disabled:text-on-surface/38",
  outlined:
    "border border-outline-variant text-on-surface-variant data-pressed:border-transparent data-pressed:bg-inverse-surface data-pressed:text-inverse-on-surface disabled:border-on-surface/12 disabled:text-on-surface/38",
};

/** Height and icon size per Expressive size. */
const iconButtonSizeClasses = {
  xs: "h-8 [&_svg:not([class*='size-'])]:size-5",
  sm: "h-10 [&_svg:not([class*='size-'])]:size-6",
  md: "h-14 [&_svg:not([class*='size-'])]:size-6",
  lg: "h-24 [&_svg:not([class*='size-'])]:size-8",
  xl: "h-34 [&_svg:not([class*='size-'])]:size-10",
};

/** Container width: narrow, default (square), or wide. */
const iconButtonWidthClasses = {
  narrow: { xs: "w-7", sm: "w-8", md: "w-12", lg: "w-16", xl: "w-26" },
  default: { xs: "w-8", sm: "w-10", md: "w-14", lg: "w-24", xl: "w-34" },
  wide: { xs: "w-10", sm: "w-13", md: "w-18", lg: "w-32", xl: "w-46" },
};

export type IconButtonVariant = keyof typeof iconButtonVariantClasses;
export type IconButtonWidth = keyof typeof iconButtonWidthClasses;

type IconButtonStyle = {
  variant?: IconButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  width?: IconButtonWidth;
  connected?: boolean;
  class?: string;
};

export function iconButtonVariants(options?: IconButtonStyle) {
  const size = options?.size ?? "sm";
  const variant = options?.variant ?? "standard";
  return cn(
    iconButtonBase,
    iconButtonVariantClasses[variant],
    iconButtonSizeClasses[size],
    iconButtonWidthClasses[options?.width ?? "default"][size],
    variant === "outlined" && outlineWidthClass(size),
    buttonShapeClasses({ size, shape: options?.shape ?? "round", connected: options?.connected }),
    options?.class
  );
}

export function toggleIconButtonVariants(options?: IconButtonStyle) {
  const size = options?.size ?? "sm";
  const variant = options?.variant ?? "standard";
  return cn(
    iconButtonBase,
    toggleIconButtonVariantClasses[variant],
    iconButtonSizeClasses[size],
    iconButtonWidthClasses[options?.width ?? "default"][size],
    variant === "outlined" && outlineWidthClass(size),
    buttonShapeClasses({
      size,
      shape: options?.shape ?? "round",
      toggle: true,
      connected: options?.connected,
    }),
    options?.class
  );
}

export interface IconButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  width?: IconButtonWidth;
}

/** Give it an `aria-label`; the icon is its only content. */
export function IconButton(props: IconButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size", "shape", "width"]);
  const group = useButtonGroupStyle(props);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="icon-button"
      data-variant={props.variant ?? "standard"}
      data-size={group.size}
      class={iconButtonVariants({
        variant: props.variant,
        size: group.size,
        shape: props.shape,
        width: props.width,
        connected: group.connected,
        class: props.class,
      })}
      {...rest}
    />
  );
}

export type ToggleIconButtonProps = ComponentProps<typeof ToggleButtonPrimitive> & {
  variant?: IconButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  width?: IconButtonWidth;
};

export function ToggleIconButton(props: ToggleIconButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size", "shape", "width"]);
  const group = useButtonGroupStyle(props);
  return (
    <ToggleButtonPrimitive
      ref={props.ref}
      data-slot="toggle-icon-button"
      data-variant={props.variant ?? "standard"}
      data-size={group.size}
      class={toggleIconButtonVariants({
        variant: props.variant,
        size: group.size,
        shape: props.shape,
        width: props.width,
        connected: group.connected,
        class: props.class,
      })}
      {...rest}
    />
  );
}
