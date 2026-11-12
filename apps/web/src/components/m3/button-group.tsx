import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { type ButtonGroupVariant, ButtonGroupContext, type ButtonSize } from "./button";
import { cn } from "@/lib/utils";

/** Space between buttons in a standard group, per size. */
const standardGapClasses = {
  xs: "gap-4.5",
  sm: "gap-3",
  md: "gap-2",
  lg: "gap-2",
  xl: "gap-2",
};

export interface ButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: ButtonGroupVariant;
  size?: ButtonSize;
}

/**
 * Groups Button, ToggleButton, IconButton, and ToggleIconButton. Children take the group's size.
 * `connected` joins them with small inner corners; a selected toggle becomes fully round.
 */
export function ButtonGroup(props: ButtonGroupProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "size"]);
  return (
    <ButtonGroupContext.Provider
      value={{
        get variant() {
          return props.variant ?? "standard";
        },
        get size() {
          return props.size;
        },
      }}
    >
      <div
        ref={props.ref}
        role="group"
        data-slot="button-group"
        data-variant={props.variant ?? "standard"}
        class={cn(
          "inline-flex items-center",
          props.variant === "connected" ? "gap-0.5" : standardGapClasses[props.size ?? "sm"],
          props.class
        )}
        {...rest}
      />
    </ButtonGroupContext.Provider>
  );
}
