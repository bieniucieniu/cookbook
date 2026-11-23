import { type ClassValue, clsx } from "clsx";

export type { ClassValue };
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A ui-sdk part's `class`: class names, or a function of the part's state that returns them. */
export type PartClass<State> = ClassValue | ((state: State) => ClassValue);

/**
 * Merges a part's own classes with the `class` a caller passed, which may be a function of the
 * part's state. Pass the result as the part's `class`; ui-sdk calls it with the current state.
 */
export function partClass<State>(
  base: ClassValue | ((state: State) => ClassValue),
  extra: PartClass<State> | undefined
): (state: State) => string {
  return (state) =>
    cn(
      typeof base === "function" ? base(state) : base,
      typeof extra === "function" ? extra(state) : extra
    );
}

/**
 * Enter and exit motion for anchored popups (popover, tooltip, menus). ui-sdk sets
 * `data-starting-style` on the first frame and `data-ending-style` while closing, and waits for
 * the transition before it unmounts.
 */
export const popupMotion =
  "origin-(--transform-origin) transition-[opacity,scale] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0";
