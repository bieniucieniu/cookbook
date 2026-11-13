import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { IconButton } from "@/components/m3/icon-button";
import { createSignal, For, type JSX, onCleanup, onMount, Show } from "solid-js";
import { cn } from "@/lib/utils";

/** A step that grows to fill the row, never narrower than 22rem (85% on a phone). */
export const growItem = "min-w-[min(22rem,85%)] flex-1";

/**
 * Steps that share a row, side by side. Steps grow to fill the row and never shrink below 22rem
 * (or 85% of the row on a phone); past that the row scrolls sideways with snapping, and
 * previous / next buttons appear next to the label. Steps are split by a vertical divider, not
 * set on cards.
 */
export function StepCarousel<T>(props: {
  each: T[];
  label: JSX.Element;
  /** Accessible name for the scrolling region, e.g. "Steps to do at the same time". */
  name: string;
  children: (item: T) => JSX.Element;
  /** Width class per item; defaults to growing with a 22rem floor. */
  itemClass?: (item: T) => string;
}) {
  let track: HTMLDivElement | undefined;
  const [overflow, setOverflow] = createSignal(false);
  const [atStart, setAtStart] = createSignal(true);
  const [atEnd, setAtEnd] = createSignal(false);

  const measure = () => {
    if (!track) return;
    setOverflow(track.scrollWidth > track.clientWidth + 1);
    setAtStart(track.scrollLeft <= 1);
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 1);
  };
  const page = (direction: 1 | -1) =>
    track?.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });

  // The items too (each from its own ref, so ones added later count): a step collapsing or
  // growing changes the overflow, not the track's size.
  const observer = new ResizeObserver(measure);
  onCleanup(() => observer.disconnect());
  onMount(() => {
    if (!track) return;
    observer.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    measure();
    onCleanup(() => track?.removeEventListener("scroll", measure));
  });

  return (
    <div class="flex flex-col gap-2">
      <div class="flex min-h-10 items-center justify-between gap-2">
        {props.label}
        <Show when={overflow()}>
          <div class="flex gap-1">
            <IconButton
              variant="tonal"
              aria-label="Previous steps"
              disabled={atStart()}
              onClick={() => page(-1)}
            >
              <IconChevronLeft aria-hidden="true" />
            </IconButton>
            <IconButton
              variant="tonal"
              aria-label="Next steps"
              disabled={atEnd()}
              onClick={() => page(1)}
            >
              <IconChevronRight aria-hidden="true" />
            </IconButton>
          </div>
        </Show>
      </div>
      <div
        ref={(element) => {
          track = element;
        }}
        role="region"
        aria-roledescription="carousel"
        aria-label={props.name}
        tabIndex={overflow() ? 0 : -1}
        class="flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain scroll-smooth -mx-2 scroll-px-2 p-2 outline-none [scrollbar-color:var(--md-sys-color-outline)_transparent] [scrollbar-width:thin] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <For each={props.each}>
          {(item) => (
            <div
              ref={(element) => {
                observer.observe(element);
                onCleanup(() => observer.unobserve(element));
              }}
              class={cn(
                "flex snap-start [&+&]:border-l [&+&]:border-outline-variant [&+&]:pl-6",
                props.itemClass?.(item) ?? growItem
              )}
            >
              {props.children(item)}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
