import { Popover as PopoverPrimitive } from "@kobalte/core/popover";
import { cn } from "@/lib/utils";
import { type ComponentProps, splitProps } from "solid-js";

/**
 * M3 has no popover. The editor needs a small surface anchored to the chip it edits, so this is
 * Kobalte's popover drawn like an M3 menu surface: surface-container-high, large corners,
 * level-2 shadow. Outlined text fields inside cut their label notch from the same color.
 */
export function Popover(props: ComponentProps<typeof PopoverPrimitive>) {
  return <PopoverPrimitive gutter={4} {...props} />;
}

export function PopoverContent(props: ComponentProps<typeof PopoverPrimitive.Content>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <PopoverPrimitive.Content
      ref={props.ref}
      class={cn(
        "z-50 flex max-h-(--kb-popper-content-available-height) w-80 max-w-[calc(100vw-2rem)] origin-(--kb-popover-content-transform-origin) flex-col gap-4 overflow-y-auto rounded-large bg-surface-container-high p-4 text-on-surface shadow-level-2 outline-none [--text-field-notch:var(--md-sys-color-surface-container-high)] data-expanded:animate-in data-expanded:fade-in-0 data-expanded:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        props.class
      )}
      {...rest}
    />
  );
}

export function PopoverTitle(props: ComponentProps<typeof PopoverPrimitive.Title>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <PopoverPrimitive.Title
      ref={props.ref}
      class={cn("typescale-title-medium text-on-surface", props.class)}
      {...rest}
    />
  );
}

export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverPortal = PopoverPrimitive.Portal;
