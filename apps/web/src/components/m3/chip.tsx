import { ToggleButton as ToggleButtonPrimitive } from "@kobalte/core/toggle-button";
import { type ComponentProps, type JSX, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

// Text nodes are invisible to selectors, so an icon next to plain text is both :first-child and
// :last-child. A lone icon counts as leading; a trailing icon needs an element before it (a leading
// icon, or the text wrapped in a span).
const chipBase =
  "group/chip relative inline-flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-small px-4 typescale-label-large whitespace-nowrap select-none state-layer focus-ring motion-fast disabled:pointer-events-none disabled:text-on-surface/38 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5 has-[>svg:first-child]:pl-2 has-[>svg:last-child:not(:first-child)]:pr-2";

/** Flat chips have an outline; elevated chips have a fill and a level-1 shadow instead. */
function surface(elevated: boolean | undefined) {
  return elevated
    ? "bg-surface-container-low shadow-level-1 hover:shadow-level-2 disabled:bg-on-surface/12 disabled:shadow-none"
    : "border border-outline-variant disabled:border-on-surface/12";
}

export interface ChipProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  elevated?: boolean;
}

/** A chip that starts an action, such as adding to a calendar. The leading icon is primary. */
export function AssistChip(props: ChipProps) {
  const [, rest] = splitProps(props, ["class", "ref", "elevated"]);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="assist-chip"
      class={cn(
        chipBase,
        surface(props.elevated),
        "text-on-surface [&>svg]:text-primary disabled:[&>svg]:text-on-surface/38",
        props.class
      )}
      {...rest}
    />
  );
}

/** A chip offering a generated suggestion, such as a quick reply. */
export function SuggestionChip(props: ChipProps) {
  const [, rest] = splitProps(props, ["class", "ref", "elevated"]);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="suggestion-chip"
      class={cn(chipBase, surface(props.elevated), "text-on-surface-variant", props.class)}
      {...rest}
    />
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" class="size-4.5">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
    </svg>
  );
}

type FilterChipProps = ComponentProps<typeof ToggleButtonPrimitive> & { elevated?: boolean };

/**
 * A chip that toggles a filter (Kobalte toggle button: `pressed` / `onChange`). Shows a check
 * mark while selected; the chip's start padding drops to 8px to make room for it.
 */
export function FilterChip(props: FilterChipProps) {
  const [, rest] = splitProps(props, ["class", "ref", "elevated", "children"]);
  return (
    <ToggleButtonPrimitive
      ref={props.ref}
      data-slot="filter-chip"
      class={cn(
        chipBase,
        surface(props.elevated),
        "text-on-surface-variant data-pressed:border-transparent data-pressed:bg-secondary-container data-pressed:text-on-secondary-container",
        props.class
      )}
      {...rest}
    >
      {(state) => (
        <>
          {/* Mounted only while pressed: a hidden icon would still match the start-padding rule. */}
          <Show when={state.pressed()}>
            <CheckIcon />
          </Show>
          {/* Plain children only; the check mark is prepended, so a render function is not supported. */}
          {props.children as JSX.Element}
        </>
      )}
    </ToggleButtonPrimitive>
  );
}

/**
 * A chip for a user-entered value, such as a recipient. Not a button itself: put an optional
 * avatar or icon, the text, and InputChipRemove inside.
 */
export function InputChip(props: JSX.HTMLAttributes<HTMLSpanElement> & { disabled?: boolean }) {
  const [, rest] = splitProps(props, ["class", "ref", "disabled"]);
  return (
    <span
      ref={props.ref}
      data-slot="input-chip"
      data-disabled={props.disabled ? "" : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      class={cn(
        "group/chip relative inline-flex h-8 shrink-0 items-center gap-2 rounded-small border border-outline-variant px-3 typescale-label-large whitespace-nowrap text-on-surface-variant data-disabled:border-on-surface/12 data-disabled:text-on-surface/38 has-[>img:first-child]:pl-1 has-[>[data-slot=input-chip-remove]:last-child]:pr-1 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4.5 [&>img]:size-6 [&>img]:rounded-full",
        props.class
      )}
      {...rest}
    />
  );
}

/** The trailing remove button of an input chip. Give it an `aria-label`. */
export function InputChipRemove(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [, rest] = splitProps(props, ["class", "ref", "children"]);
  return (
    <button
      ref={props.ref}
      type="button"
      data-slot="input-chip-remove"
      class={cn(
        "relative flex size-6 cursor-pointer items-center justify-center rounded-full state-layer focus-ring disabled:pointer-events-none [&_svg]:size-4.5",
        props.class
      )}
      {...rest}
    >
      {props.children ?? (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      )}
    </button>
  );
}

/** Lays out chips in a wrapping row. */
export function ChipSet(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      role="group"
      data-slot="chip-set"
      class={cn("flex flex-wrap items-center gap-2", props.class)}
      {...rest}
    />
  );
}
