import {
  Popover as PopoverPrimitive,
  PopoverContent as PopoverContentPrimitive,
  PopoverTitle as PopoverTitlePrimitive,
  PopoverTrigger as PopoverTriggerPrimitive,
} from "@ui-sdk/solid/popover";
import { type ComponentProps } from "solid-js";
import { partClass, popupMotion } from "@/lib/utils";

/**
 * M3 has no popover. The editor needs a small surface anchored to the chip it edits, so this is
 * ui-sdk's popover drawn like an M3 menu surface: surface-container-high, large corners,
 * level-2 shadow. Outlined text fields inside cut their label notch from the same color.
 */
export const Popover = PopoverPrimitive;

export function PopoverContent(props: ComponentProps<typeof PopoverContentPrimitive>) {
  return (
    <PopoverContentPrimitive
      sideOffset={4}
      {...props}
      class={partClass(
        `z-50 flex max-h-(--available-height) w-80 max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-y-auto rounded-large bg-surface-container-high p-4 text-on-surface shadow-level-2 outline-none [--text-field-notch:var(--md-sys-color-surface-container-high)] ${popupMotion}`,
        props.class
      )}
    />
  );
}

export function PopoverTitle(props: ComponentProps<typeof PopoverTitlePrimitive>) {
  return (
    <PopoverTitlePrimitive
      {...props}
      class={partClass("typescale-title-medium text-on-surface", props.class)}
    />
  );
}

export const PopoverTrigger = PopoverTriggerPrimitive;
