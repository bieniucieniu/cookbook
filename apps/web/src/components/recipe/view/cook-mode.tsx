import {
  IconArrowsShuffle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconGitBranch,
  IconPlayerPlay,
} from "@/components/icons";
import { Button } from "@/components/m3/button";
import { InputChip, InputChipRemove } from "@/components/m3/chip";
import { ExtendedFab } from "@/components/m3/fab";
import { IconButton } from "@/components/m3/icon-button";
import { Progress, ProgressLabel, ProgressTrack, ProgressFill } from "@/components/m3/progress";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/m3/tabs";
import { Toolbar } from "@/components/m3/toolbar";
import { AnimatePresence, motion } from "@/components/motion";
import { notify } from "@/components/notify";
import type { Catalog } from "@/lib/catalog";
import type { DraftNode, RecipeDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import { formatDuration, scaleQty } from "@/lib/units";
import { cn } from "@/lib/utils";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { createStore } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import { MarkdownView } from "../markdown";
import { ItemChip, spanLabel } from "../parts";
import { IngredientList, IngredientListItem } from "./ingredient-list";

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
 * One screen per row of the recipe. Parallel steps show as tabs, a "pick one" split as a
 * choice. The open step comes from the route (`stepKey`); moving on calls `onStep`, and a tab
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
  // Slide forward or back depending on where the new row sits relative to the last one.
  const motionState = createMemo<{ index: number; direction: number }>(
    (prev) => ({
      index: index(),
      direction: index() === prev.index ? prev.direction : index() > prev.index ? 1 : -1,
    }),
    { index: index(), direction: 1 }
  );
  const direction = () => motionState().direction;
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
  const [done, setDone] = createStore<Record<string, boolean>>({});
  const [timers, setTimers] = createSignal<Timer[]>([]);
  const [now, setNow] = createSignal(Date.now());
  let nextTimerId = 1;
  const tick = setInterval(() => setNow(Date.now()), 500);
  onCleanup(() => clearInterval(tick));

  const row = () => rows()[index()] ?? [];
  const go = (delta: number) => {
    openRow(Math.min(rows().length - 1, Math.max(0, index() + delta)));
  };
  const rowMode = (nodes: DraftNode[]) => {
    const parent = props.draft.edges.find((edge) => edge.to === nodes[0]?.key)?.from;
    return props.draft.nodes.find((node) => node.key === parent)?.branchMode === "xor"
      ? "xor"
      : "and";
  };

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

      <nav class="flex items-center justify-center gap-1.5" aria-label="Parts">
        <For each={rows()}>
          {(_, at) => (
            <button
              type="button"
              aria-label={`Go to part ${at() + 1}`}
              aria-current={at() === index() ? "step" : undefined}
              class={cn(
                "h-2.5 cursor-pointer rounded-full focus-ring motion-default",
                at() === index()
                  ? "w-8 bg-primary"
                  : at() < index()
                    ? "w-2.5 bg-primary/40"
                    : "w-2.5 bg-outline-variant"
              )}
              onClick={() => openRow(at())}
            />
          )}
        </For>
      </nav>

      {/*
        Clips the slide between parts. It spans the page gutter (negative margin, matching
        padding) so content that bleeds into the gutter, like the ingredient rows, is not cut off.
      */}
      <div class="relative -mx-4 min-h-[50vh] overflow-hidden px-4 medium:-mx-6 medium:px-6">
        <AnimatePresence each={[index()]} by={(value) => value} mode="wait">
          {() => (
            <motion.section
              initial={{ opacity: 0, x: direction() * 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction() * -48 }}
              // M3 fast spatial spring for the slide, fast effects curve for the fade.
              transition={{
                type: "spring",
                visualDuration: 0.35,
                bounce: 0.2,
                opacity: { duration: 0.15, ease: [0.31, 0.94, 0.34, 1] },
              }}
              class="flex flex-col gap-4"
            >
              <Show
                when={row().length > 1}
                fallback={
                  <Show when={row()[0]}>
                    {(node) => (
                      <CookStep
                        node={node()}
                        {...props}
                        done={done}
                        setDone={setDone}
                        onTimer={startTimer}
                        comments={props.comments}
                      />
                    )}
                  </Show>
                }
              >
                <span class="inline-flex items-center gap-1.5 typescale-label-large text-on-surface-variant">
                  <Dynamic
                    component={rowMode(row()) === "xor" ? IconArrowsShuffle : IconGitBranch}
                    size={18}
                    aria-hidden="true"
                  />
                  {rowMode(row()) === "xor" ? "Pick one" : "Do these at the same time"}
                </span>
                <Tabs
                  variant="secondary"
                  value={
                    row().some((node) => node.key === props.stepKey) ? props.stepKey : row()[0]?.key
                  }
                  onChange={(key) => props.onStep(key, true)}
                >
                  <TabsList>
                    <For each={row()}>
                      {(node) => (
                        <TabsTrigger value={node.key}>
                          <Show when={done[node.key]}>
                            <IconCheck class="size-5" aria-hidden="true" />
                          </Show>
                          {node.title}
                        </TabsTrigger>
                      )}
                    </For>
                    <TabsIndicator />
                  </TabsList>
                  <For each={row()}>
                    {(node) => (
                      <TabsContent value={node.key}>
                        <CookStep
                          node={node}
                          {...props}
                          done={done}
                          setDone={setDone}
                          onTimer={startTimer}
                          comments={props.comments}
                        />
                      </TabsContent>
                    )}
                  </For>
                </Tabs>
              </Show>
            </motion.section>
          )}
        </AnimatePresence>
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

function CookStep(props: {
  node: DraftNode;
  draft: RecipeDraft;
  cooks: number;
  catalog: Catalog;
  done: Record<string, boolean>;
  setDone: (key: string, value: boolean) => void;
  onTimer: (label: string, seconds: number) => void;
  comments?: (stepKey: string) => JSX.Element;
}) {
  const [got, setGot] = createStore<Record<number, boolean>>({});
  const scale = (qty: number | null | undefined) =>
    qty == null ? qty : scaleQty(qty, props.draft.cooks, props.cooks);
  const done = () => props.done[props.node.key] ?? false;
  return (
    <div class="flex flex-col gap-5">
      <h2 class="typescale-emphasized-headline-large text-on-surface">
        {props.node.title}
        <Show when={props.node.repeatMin > 1}>
          <span class="ml-2 typescale-title-large text-on-surface-variant">
            ×{props.node.repeatMin}
          </span>
        </Show>
      </h2>
      {/*
        What you need on the left, what to do on the right from the expanded breakpoint. Stacked
        below it, needs first. The stage controls (parts nav and toolbar) stay outside.
      */}
      <div class="grid gap-x-8 gap-y-5 expanded:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] expanded:items-start">
        <Show when={props.node.ingredients.length + props.node.tools.length > 0}>
          <div class="flex flex-col gap-4">
            <Show when={props.node.ingredients.length > 0}>
              {/* Rows reach the page edge on the left; on wide screens not into the gap. */}
              <IngredientList aria-label="Ingredients for this step" class="-mx-4 expanded:mr-0">
                <For each={props.node.ingredients}>
                  {(item) => (
                    <IngredientListItem
                      name={props.catalog.name("ingredient", item.ingredientId)}
                      qty={scale(item.qty)}
                      unit={item.unit}
                      optional={item.optional}
                      alts={(item.alts ?? []).map((alt) =>
                        props.catalog.name("ingredient", alt.altIngredientId)
                      )}
                      checked={got[item.ingredientId] ?? false}
                      onChange={(value) => setGot(item.ingredientId, value)}
                    />
                  )}
                </For>
              </IngredientList>
            </Show>
            <Show when={props.node.tools.length > 0}>
              <ul class="flex flex-wrap gap-2" aria-label="Tools for this step">
                <For each={props.node.tools}>
                  {(item) => (
                    <li>
                      <ItemChip
                        kind="tool"
                        name={props.catalog.name("tool", item.toolId)}
                        optional={item.optional}
                        static
                      />
                      <Show when={(item.alts ?? []).length > 0}>
                        <span class="ml-1 typescale-body-medium text-on-surface-variant">
                          or{" "}
                          {(item.alts ?? [])
                            .map((alt) => props.catalog.name("tool", alt.altToolId))
                            .join(", ")}
                        </span>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </Show>
        <div class="flex min-w-0 flex-col gap-5 expanded:col-start-2">
          <Show when={props.node.body.trim()}>
            <MarkdownView value={props.node.body} class="typescale-body-large" />
          </Show>
          {/*
            Timers are secondary actions: tonal for hands-on time, dashed outline for waiting,
            each with a play icon. Mark done is the step's main action: filled until pressed,
            then tonal with a check.
          */}
          <Show when={props.node.spans.length > 0}>
            <div class="flex flex-wrap gap-2" aria-label="Timers for this step">
              <For each={props.node.spans}>
                {(span) => (
                  <Button
                    variant={span.kind === "wait" ? "outlined" : "tonal"}
                    size="sm"
                    class={cn(span.kind === "wait" && "border-dashed border-outline")}
                    aria-label={`Start a ${formatDuration(span.seconds)} ${spanLabel[span.kind].toLowerCase()} timer`}
                    onClick={() =>
                      props.onTimer(`${props.node.title} · ${spanLabel[span.kind]}`, span.seconds)
                    }
                  >
                    <IconPlayerPlay aria-hidden="true" />
                    <span class="tabular-nums">{formatDuration(span.seconds)}</span>
                    <span class="opacity-80">{spanLabel[span.kind]}</span>
                  </Button>
                )}
              </For>
            </div>
          </Show>
          <Button
            variant={done() ? "tonal" : "filled"}
            size="md"
            class="w-fit"
            aria-pressed={done()}
            onClick={() => props.setDone(props.node.key, !done())}
          >
            <IconCheck aria-hidden="true" />
            {done() ? "Done" : "Mark done"}
          </Button>
          <Show when={props.comments}>{(comments) => comments()(props.node.key)}</Show>
        </div>
      </div>
    </div>
  );
}
