import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const toolbarVariantClasses = {
  /** Full width along the bottom (or top) edge. */
  docked: "flex h-16 w-full items-center justify-between gap-2 px-4",
  /** A pill that floats over content, with a level-3 shadow. */
  floating:
    "inline-flex items-center gap-1 rounded-full p-2 shadow-level-3 data-[orientation=horizontal]:h-16 data-[orientation=vertical]:w-16 data-[orientation=vertical]:flex-col",
};

const toolbarColorClasses = {
  standard: "bg-surface-container text-on-surface-variant",
  /** Primary container. Standard icon buttons inside follow its content color. */
  vibrant:
    "bg-primary-container text-on-primary-container [&_[data-slot=icon-button][data-variant=standard]]:text-inherit [&_[data-slot=toggle-icon-button][data-variant=standard]]:text-inherit",
};

export type ToolbarVariant = keyof typeof toolbarVariantClasses;
export type ToolbarColor = keyof typeof toolbarColorClasses;

export interface ToolbarProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: ToolbarVariant;
  color?: ToolbarColor;
  orientation?: "horizontal" | "vertical";
}

/** Frequently used actions for the current page. Put icon buttons and buttons inside. */
export function Toolbar(props: ToolbarProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant", "color", "orientation"]);
  return (
    <div
      ref={props.ref}
      role="toolbar"
      aria-orientation={props.orientation ?? "horizontal"}
      data-slot="toolbar"
      data-variant={props.variant ?? "docked"}
      data-orientation={props.orientation ?? "horizontal"}
      class={cn(
        toolbarVariantClasses[props.variant ?? "docked"],
        toolbarColorClasses[props.color ?? "standard"],
        props.class
      )}
      {...rest}
    />
  );
}
