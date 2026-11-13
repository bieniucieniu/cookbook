import { IconCheck, IconChevronLeft, IconChevronRight, IconClock } from "@/components/icons";
import { InputChip, InputChipRemove } from "@/components/m3/chip";
import { ExtendedFab } from "@/components/m3/fab";
import { IconButton } from "@/components/m3/icon-button";
import { Progress, ProgressLabel, ProgressTrack, ProgressFill } from "@/components/m3/progress";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/m3/tabs";
import { Toolbar } from "@/components/m3/toolbar";
import { notify } from "@/components/notify";
import type { Catalog } from "@/lib/catalog";
import type { DraftNode, RecipeDraft } from "@/lib/recipe-draft";
import { lanes, rowMode } from "@/lib/recipe-graph";
import { cn } from "@/lib/utils";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { RowLabel } from "../parts";
import { StepView } from "./step-view";

type Timer = { id: number; label: string; endsAt: number; seconds: number };

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/**
 * Keeps the screen on while cooking. The browser drops the lock whenever the page is hidden
 * (another app, a locked phone), so it is asked for again each time the page comes back.
 * Fails quietly where the API is missing or refused.
 */
function useWakeLock() {
  let lock: { release: () => Promise<void> } | undefined;
  let active = true;
  const request = async () => {
    if (document.visibilityState !== "visible") return;
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      };
      const next = await nav.wakeLock?.request("screen");
      // Unmounted while the request was pending: let go at once.
      if (!active) void next?.release().catch(() => undefined);
      else lock = next;
    } catch {
      lock = undefined;
    }
  };
  const onVisible = () => void request();
  onMount(() => {
    void request();
    document.addEventListener("visibilitychange", onVisible);
  });
  onCleanup(() => {
    active = false;
    document.removeEventListener("visibilitychange", onVisible);
    void lock?.release().catch(() => undefined);
  });
}

/**
 * One screen per row of the recipe. Parallel steps stack on their slide (the slides already
 * swipe sideways, so no inner carousel), a "pick one" split shows its options as tabs. The open step comes from the route (`stepKey`); moving on calls `onStep`, and a tab
 * switch replaces the history entry. Timers start from a step and keep their label when you
 * move on.
 */
export function CookMode(props: {
  draft: RecipeDraft;
  cooks: number;
  catalog: Catalog;
  stepKey: string;
  onStep: (stepKey: string, replace?: boolean) => void;
  /** Comments for one step, shown collapsed under it. */
  comments?: (stepKey: string) => JSX.Element;
}) {
  useWakeLock();
  // Snackbars (finished timers) sit above the floating toolbar: 64px bar + 16px gap.
  onMount(() => document.documentElement.style.setProperty("--snackbar-offset", "5rem"));
  onCleanup(() => document.documentElement.style.removeProperty("--snackbar-offset"));
  const rows = createMemo(() => lanes(props.draft.nodes, props.draft.edges));
  /** Row holding the step in the URL. An unknown key falls back to the first row. */
  const index = createMemo(() =>
    Math.max(
      0,
      rows().findIndex((row) => row.some((node) => node.key === props.stepKey))
    )
  );
  const openRow = (at: number) => {
    const key = rows()[at]?.[0]?.key;
    if (key) props.onStep(key);
  };
  // A step key that is not in the recipe lands on the first step instead.
  createEffect(() => {
    const first = rows()[0]?.[0]?.key;
    if (first && !rows().some((row) => row.some((node) => node.key === props.stepKey)))
      props.onStep(first, true);
  });
  const [timers, setTimers] = createSignal<Timer[]>([]);
  const [now, setNow] = createSignal(Date.now());
  let nextTimerId = 1;
  const tick = setInterval(() => setNow(Date.now()), 500);
  onCleanup(() => clearInterval(tick));

  const go = (delta: number) => {
    openRow(Math.min(rows().length - 1, Math.max(0, index() + delta)));
  };
  const modeOf = (nodes: DraftNode[]) => rowMode(nodes, props.draft.nodes, props.draft.edges);
  const cookStep = (node: DraftNode) => (
    <CookStep
      node={node}
      draft={props.draft}
      cooks={props.cooks}
      catalog={props.catalog}
      onTimer={startTimer}
      comments={props.comments}
    />
  );

  /*
   * Parts sit side by side in a scroll-snap track, one full-width slide each. Swiping settles on
   * a slide and opens it; a route change (dots, toolbar, back button) scrolls to its slide.
   */
  let track: HTMLDivElement | undefined;
  const slides: HTMLElement[] = [];
  /** Slide a programmatic scroll is heading to; settling ignores the slides it passes. */
  let target: number | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  const visibleSlide = () =>
    track && track.clientWidth > 0 ? Math.round(track.scrollLeft / track.clientWidth) : index();
  const settle = (ended: boolean) => {
    const at = visibleSlide();
    if (target !== undefined) {
      if (at !== target && !ended) return;
      target = undefined;
    }
    sizeFor(at, at);
    if (at !== index()) openRow(at);
  };
  const onScroll = () => {
    clearTimeout(settleTimer);
    // Fallback where `scrollend` is missing.
    settleTimer = setTimeout(() => settle(false), 150);
  };
  const onScrollEnd = () => {
    clearTimeout(settleTimer);
    settle(true);
  };
  const userScroll = () => {
    target = undefined;
    // About to swipe: room for either neighbour before anything moves.
    const at = restingSlide();
    if (at !== undefined) sizeFor(at - 1, at + 1);
  };
  onCleanup(() => clearTimeout(settleTimer));
  /*
   * The router's scroll restoration records every scrolled element (a capture listener on
   * document) and writes the old scrollLeft back after each step navigation, which cancels the
   * scroll to the new slide. The route already says which slide is open, so the track's scroll
   * stops at window and never reaches that listener.
   */
  onMount(() => {
    const hideScroll = (event: Event) => {
      if (event.target !== track) return;
      event.stopPropagation();
      onScroll();
    };
    window.addEventListener("scroll", hideScroll, { capture: true, passive: true });
    onCleanup(() => window.removeEventListener("scroll", hideScroll, { capture: true }));
  });

  /** Wraps the track. On a part change the page scrolls so it sits under the app bar. */
  let stage: HTMLDivElement | undefined;
  let placed = false;
  createEffect(() => {
    const at = index();
    const changed = placed;
    const smooth = changed && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    placed = true;
    // Opening the page keeps the recipe header in view; moving between parts does not.
    if (changed) stage?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" });
    if (!track || visibleSlide() === at) return;
    if (smooth) target = at;
    // Room for every slide the scroll passes, set before it starts.
    sizeFor(visibleSlide(), at);
    track.scrollTo({ left: at * track.clientWidth, behavior: smooth ? "smooth" : "instant" });
  });

  /*
   * The track is as tall as the open part at rest, so a long part does not leave a gap under a
   * short one. Changing its height while it scrolls makes the browser re-snap, which stops the
   * scroll on the wrong part, so it only grows before a scroll starts (to fit every part the
   * scroll will pass) and shrinks once the scroll has settled. Set on the element directly: the
   * new height has to be laid out before `scrollTo` runs.
   */
  function sizeFor(from: number, to: number) {
    if (!track) return;
    let tallest = 0;
    for (let at = Math.max(0, Math.min(from, to)); at <= Math.max(from, to); at++)
      tallest = Math.max(tallest, slides[at]?.offsetHeight ?? 0);
    if (tallest === 0) return;
    track.style.height = `${tallest}px`;
    void track.offsetHeight;
  }
  /** Slide the track sits on, or undefined while it is between two. */
  function restingSlide() {
    if (!track || track.clientWidth === 0) return undefined;
    const x = track.scrollLeft / track.clientWidth;
    const at = Math.round(x);
    return Math.abs(x - at) < 0.01 ? at : undefined;
  }
  onMount(() => {
    // A part that grows or shrinks (comments opened, a window resize) refits at rest.
    const observer = new ResizeObserver(() => {
      const at = restingSlide();
      if (at !== undefined && target === undefined) sizeFor(at, at);
    });
    createEffect(() => {
      observer.disconnect();
      for (const slide of slides.slice(0, rows().length)) if (slide) observer.observe(slide);
      const at = restingSlide();
      if (at !== undefined) sizeFor(at, at);
    });
    onCleanup(() => observer.disconnect());
  });

  const startTimer = (label: string, seconds: number) =>
    setTimers((list) => [
      ...list,
      { id: nextTimerId++, label, seconds, endsAt: Date.now() + seconds * 1000 },
    ]);

  const remaining = (timer: Timer) => (timer.endsAt - now()) / 1000;

  // Each finished timer announces itself once in a snackbar that stays until dismissed.
  const announced = new Set<number>();
  createEffect(() => {
    for (const timer of timers()) {
      if (remaining(timer) > 0 || announced.has(timer.id)) continue;
      announced.add(timer.id);
      notify(`Timer done: ${timer.label}`, { persistent: true });
    }
  });

  return (
    // Bottom padding keeps the last line clear of the fixed toolbar.
    <div class="flex flex-col gap-4 pb-20">
      <Show when={timers().length > 0}>
        <ul
          class="sticky top-(--app-bar-height) z-20 -mx-4 flex flex-wrap gap-2 bg-surface-container px-4 py-2 medium:-mx-6 medium:px-6"
          aria-label="Timers"
        >
          <For each={timers()}>
            {(timer) => (
              <li role="timer">
                <InputChip
                  class={cn(
                    "h-10 pr-1",
                    remaining(timer) <= 0 &&
                      "border-transparent bg-error-container text-on-error-container"
                  )}
                >
                  <Show when={remaining(timer) <= 0} fallback={<IconClock aria-hidden="true" />}>
                    <IconCheck aria-hidden="true" />
                  </Show>
                  <span class="tabular-nums">
                    {remaining(timer) <= 0 ? "Done" : formatClock(remaining(timer))}
                  </span>
                  <span class="max-w-40 truncate opacity-80">{timer.label}</span>
                  <InputChipRemove
                    aria-label={`Stop timer ${timer.label}`}
                    onClick={() => setTimers((list) => list.filter((item) => item.id !== timer.id))}
                  />
                </InputChip>
              </li>
            )}
          </For>
        </ul>
      </Show>

      {/*
        The stage fills the screen between the app bar and the floating toolbar (5rem, the same
        as the bottom padding above), less its 1rem padding top and bottom (2rem). It can scroll
        up to sit right below the app bar even when the open part is short. Where you are is in
        the toolbar.
      */}
      <div
        ref={(element) => {
          stage = element;
        }}
        class="flex min-h-[calc(100dvh-var(--app-bar-height)-5rem-2rem)] scroll-mt-(--app-bar-height) flex-col py-4"
      >
        {/*
        Spans the page gutter (negative margin) so each slide is the full width and its content,
        padded back in, can bleed into the gutter like the ingredient rows do.
      */}
        <div
          ref={(element) => {
            track = element;
          }}
          role="region"
          aria-roledescription="carousel"
          aria-label="Recipe parts"
          class="-mx-4 flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] medium:-mx-6"
          on:scrollend={onScrollEnd}
          onPointerDown={userScroll}
          onWheel={userScroll}
          onTouchStart={userScroll}
        >
          <For each={rows()}>
            {(nodes, at) => (
              <section
                ref={(element) => {
                  slides[at()] = element;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`Part ${at() + 1} of ${rows().length}`}
                // Off-screen parts stay out of tab order and the a11y tree; a swipe on them falls
                // through to the track.
                inert={at() !== index() ? true : undefined}
                class="flex w-full shrink-0 snap-start snap-always flex-col gap-4 px-4 medium:px-6"
              >
                <Switch>
                  <Match when={nodes.length === 1 && nodes[0]}>{(node) => cookStep(node())}</Match>
                  {/* Pick one: the options are tabs, one step at a time. */}
                  <Match when={modeOf(nodes) === "xor"}>
                    <RowLabel mode="xor" />
                    <Tabs
                      variant="secondary"
                      value={
                        nodes.some((node) => node.key === props.stepKey)
                          ? props.stepKey
                          : nodes[0]?.key
                      }
                      onChange={(key) => props.onStep(key, true)}
                    >
                      <TabsList aria-label="Steps to pick from">
                        <For each={nodes}>
                          {(node) => <TabsTrigger value={node.key}>{node.title}</TabsTrigger>}
                        </For>
                        <TabsIndicator />
                      </TabsList>
                      <For each={nodes}>
                        {(node) => (
                          <TabsContent value={node.key} class="pt-4">
                            {cookStep(node)}
                          </TabsContent>
                        )}
                      </For>
                    </Tabs>
                  </Match>
                  {/* At the same time: stacked on the slide, split by dividers. */}
                  <Match when>
                    <RowLabel mode="and" />
                    <div class="flex flex-col divide-y divide-outline-variant">
                      <For each={nodes}>
                        {(node) => <div class="py-6 first:pt-0 last:pb-0">{cookStep(node)}</div>}
                      </For>
                    </div>
                  </Match>
                </Switch>
              </section>
            )}
          </For>
        </div>
      </div>

      {/* Floating toolbar paired with a FAB: the FAB carries the one emphasized action. */}
      <div class="fixed inset-x-0 bottom-4 z-20 flex items-center justify-center gap-3 px-4">
        <Toolbar variant="floating" class="min-w-0 flex-1 gap-3 pr-5 medium:max-w-md">
          <IconButton
            variant="tonal"
            aria-label="Previous part"
            disabled={index() === 0}
            onClick={() => go(-1)}
          >
            <IconChevronLeft aria-hidden="true" />
          </IconButton>
          <Progress
            value={index() + 1}
            minValue={0}
            maxValue={rows().length}
            getValueLabel={({ value, max }) => `Part ${value} of ${max}`}
            class="min-w-0 flex-1 gap-1"
          >
            <ProgressLabel class="typescale-label-large text-on-surface-variant tabular-nums">
              Part {index() + 1} of {rows().length}
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill wavy />
            </ProgressTrack>
          </Progress>
        </Toolbar>
        <ExtendedFab
          variant="primary"
          disabled={index() >= rows().length - 1}
          onClick={() => go(1)}
        >
          Next
          <IconChevronRight aria-hidden="true" />
        </ExtendedFab>
      </div>
    </div>
  );
}

/** One step on a cook slide: the step itself, then its comments. */
function CookStep(props: {
  node: DraftNode;
  draft: RecipeDraft;
  cooks: number;
  catalog: Catalog;
  onTimer: (label: string, seconds: number) => void;
  comments?: (stepKey: string) => JSX.Element;
}) {
  return (
    <StepView
      node={props.node}
      catalog={props.catalog}
      draftCooks={props.draft.cooks}
      cooks={props.cooks}
      size="large"
      checkable
      onTimer={props.onTimer}
      footer={<Show when={props.comments}>{(comments) => comments()(props.node.key)}</Show>}
    />
  );
}
