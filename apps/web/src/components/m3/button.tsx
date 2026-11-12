import { ToggleButton as ToggleButtonPrimitive } from "@kobalte/core/toggle-button";
import type { ComponentProps, JSX } from "solid-js";
import { createContext, splitProps, useContext } from "solid-js";
import { cn } from "@/lib/utils";

const buttonBase =
  "group/button relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap select-none state-layer focus-ring motion-fast disabled:pointer-events-none disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0";

/** Colors at rest. Disabled colors are shared: on-surface at 10% (container) and 38% (content). */
const buttonVariantClasses = {
  elevated:
    "bg-surface-container-low text-primary shadow-level-1 hover:shadow-level-2 disabled:bg-on-surface/10 disabled:text-on-surface/38",
  filled:
    "bg-primary text-on-primary hover:shadow-level-1 disabled:bg-on-surface/10 disabled:text-on-surface/38",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:shadow-level-1 disabled:bg-on-surface/10 disabled:text-on-surface/38",
  outlined:
    "border border-outline-variant text-on-surface-variant disabled:border-on-surface/12 disabled:text-on-surface/38",
  text: "text-primary disabled:text-on-surface/38",
};

/** Height, padding, gap, label type, icon size, and outline width for each Expressive size. */
const buttonSizeClasses = {
  xs: "h-8 gap-1 px-3 typescale-label-large [&_svg:not([class*='size-'])]:size-5",
  sm: "h-10 gap-2 px-4 typescale-label-large [&_svg:not([class*='size-'])]:size-5",
  md: "h-14 gap-2 px-6 typescale-title-medium [&_svg:not([class*='size-'])]:size-6",
  lg: "h-24 gap-3 px-12 typescale-headline-small [&_svg:not([class*='size-'])]:size-8",
  xl: "h-34 gap-4 px-16 typescale-headline-large [&_svg:not([class*='size-'])]:size-10",
};

/** Outline width for outlined buttons. */
const outlineWidthClasses = { xs: "", sm: "", md: "", lg: "border-2", xl: "border-3" };

/**
 * Corner radius per size. Round corners are half the height (not rounded-full) so they can morph
 * to the pressed and square radii.
 */
const shapeScale = {
  round: {
    xs: "rounded-[1rem]",
    sm: "rounded-[1.25rem]",
    md: "rounded-[1.75rem]",
    lg: "rounded-[3rem]",
    xl: "rounded-[4.25rem]",
  },
  square: {
    xs: "rounded-medium",
    sm: "rounded-medium",
    md: "rounded-large",
    lg: "rounded-extra-large",
    xl: "rounded-extra-large",
  },
  pressed: {
    xs: "active:rounded-small",
    sm: "active:rounded-small",
    md: "active:rounded-medium",
    lg: "active:rounded-large",
    xl: "active:rounded-large",
  },
  /**
   * Inside a connected button group: small inner corners, round outer corners on the ends, and
   * fully round when selected.
   */
  connected: {
    xs: "rounded-[4px] first:rounded-s-[1rem] last:rounded-e-[1rem] data-pressed:not-active:rounded-[1rem]",
    sm: "rounded-[8px] first:rounded-s-[1.25rem] last:rounded-e-[1.25rem] data-pressed:not-active:rounded-[1.25rem]",
    md: "rounded-[8px] first:rounded-s-[1.75rem] last:rounded-e-[1.75rem] data-pressed:not-active:rounded-[1.75rem]",
    lg: "rounded-[16px] first:rounded-s-[3rem] last:rounded-e-[3rem] data-pressed:not-active:rounded-[3rem]",
    xl: "rounded-[20px] first:rounded-s-[4.25rem] last:rounded-e-[4.25rem] data-pressed:not-active:rounded-[4.25rem]",
  },
  /** A selected toggle takes the opposite resting shape. */
  selected: {
    round: {
      xs: "data-pressed:not-active:rounded-medium",
      sm: "data-pressed:not-active:rounded-medium",
      md: "data-pressed:not-active:rounded-large",
      lg: "data-pressed:not-active:rounded-extra-large",
      xl: "data-pressed:not-active:rounded-extra-large",
    },
    square: {
      xs: "data-pressed:not-active:rounded-[1rem]",
      sm: "data-pressed:not-active:rounded-[1.25rem]",
      md: "data-pressed:not-active:rounded-[1.75rem]",
      lg: "data-pressed:not-active:rounded-[3rem]",
      xl: "data-pressed:not-active:rounded-[4.25rem]",
    },
  },
};

/** Toggle colors: unselected first, then data-pressed (Kobalte's selected attribute). */
const toggleVariantClasses = {
  elevated:
    "bg-surface-container-low text-primary shadow-level-1 hover:shadow-level-2 data-pressed:bg-primary data-pressed:text-on-primary disabled:bg-on-surface/10 disabled:text-on-surface/38",
  filled:
    "bg-surface-container text-on-surface-variant hover:shadow-level-1 data-pressed:bg-primary data-pressed:text-on-primary disabled:bg-on-surface/10 disabled:text-on-surface/38",
  tonal:
    "bg-secondary-container text-on-secondary-container hover:shadow-level-1 data-pressed:bg-secondary data-pressed:text-on-secondary disabled:bg-on-surface/10 disabled:text-on-surface/38",
  outlined:
    "border border-outline-variant text-on-surface-variant data-pressed:border-transparent data-pressed:bg-inverse-surface data-pressed:text-inverse-on-surface disabled:border-on-surface/12 disabled:text-on-surface/38",
};

export type ButtonVariant = keyof typeof buttonVariantClasses;
export type ButtonSize = keyof typeof buttonSizeClasses;
export type ButtonShape = "round" | "square";
export type ToggleButtonVariant = keyof typeof toggleVariantClasses;

/**
 * Corner classes for a button-like control: resting shape, pressed morph, and (for toggles) the
 * selected shape. Icon buttons, FABs, and split buttons share this scale.
 */
export function buttonShapeClasses(options: {
  size: ButtonSize;
  shape: ButtonShape;
  toggle?: boolean;
  connected?: boolean;
}) {
  if (options.connected) return shapeScale.connected[options.size];
  return cn(
    shapeScale[options.shape][options.size],
    options.toggle && shapeScale.selected[options.shape][options.size],
    shapeScale.pressed[options.size]
  );
}

/** Outline width for outlined controls at each size. */
export function outlineWidthClass(size: ButtonSize) {
  return outlineWidthClasses[size];
}

export function buttonVariants(options?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  connected?: boolean;
  class?: string;
}) {
  const size = options?.size ?? "sm";
  const shape = options?.shape ?? "round";
  const variant = options?.variant ?? "filled";
  return cn(
    buttonBase,
    buttonVariantClasses[variant],
    buttonSizeClasses[size],
    variant === "outlined" && outlineWidthClasses[size],
    buttonShapeClasses({ size, shape, connected: options?.connected }),
    options?.class
  );
}

export function toggleButtonVariants(options?: {
  variant?: ToggleButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  connected?: boolean;
  class?: string;
}) {
  const size = options?.size ?? "sm";
  const shape = options?.shape ?? "round";
  const variant = options?.variant ?? "filled";
  return cn(
    buttonBase,
    toggleVariantClasses[variant],
    buttonSizeClasses[size],
    variant === "outlined" && outlineWidthClasses[size],
    buttonShapeClasses({ size, shape, toggle: true, connected: options?.connected }),
    options?.class
  );
}

export type ButtonGroupVariant = "standard" | "connected";

/** Set by ButtonGroup. Buttons inside take its size, and connected groups set their corners. */
export const ButtonGroupContext = createContext<{
  variant?: ButtonGroupVariant;
  size?: ButtonSize;
}>();

/** Size and corner mode from an enclosing ButtonGroup, falling back to the control's own props. */
export function useButtonGroupStyle(props: { size?: ButtonSize }) {
  const group = useContext(ButtonGroupContext);
  return {
    get size(): ButtonSize {
      return props.size ?? group?.size ?? "sm";
    },
    get connected() {
      return group?.variant === "connected";
    },
  };
}

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
}

export function Button(props: ButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size", "shape"]);
  const group = useButtonGroupStyle(props);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="button"
      data-variant={props.variant ?? "filled"}
      data-size={group.size}
      data-shape={props.shape ?? "round"}
      class={buttonVariants({
        variant: props.variant,
        size: group.size,
        shape: props.shape,
        connected: group.connected,
        class: props.class,
      })}
      {...rest}
    />
  );
}

export type ToggleButtonProps = ComponentProps<typeof ToggleButtonPrimitive> & {
  variant?: ToggleButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
};

/** A button that stays selected. Uses `pressed` / `onChange` from Kobalte's toggle button. */
export function ToggleButton(props: ToggleButtonProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size", "shape"]);
  const group = useButtonGroupStyle(props);
  return (
    <ToggleButtonPrimitive
      ref={props.ref}
      data-slot="toggle-button"
      data-variant={props.variant ?? "filled"}
      data-size={group.size}
      data-shape={props.shape ?? "round"}
      class={toggleButtonVariants({
        variant: props.variant,
        size: group.size,
        shape: props.shape,
        connected: group.connected,
        class: props.class,
      })}
      {...rest}
    />
  );
}
