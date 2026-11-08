import {
  IconArrowsShuffle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconGitBranch,
  IconPlayerPlay,
  IconX,
} from "@/components/icons";
import { AnimatePresence, motion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Catalog } from "@/lib/catalog";
import type { DraftNode, RecipeDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import { formatDuration, scaleQty } from "@/lib/units";
import { cn } from "@/lib/utils";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import { MarkdownView } from "../markdown";
import { ItemChip, spanIcon, spanLabel } from "../parts";

type Timer = { id: number; label: string; endsAt: number; seconds: number };

function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/** Keeps the screen on while cooking. Fails quietly where the API is missing or refused. */
function useWakeLock() {
  let lock: { release: () => Promise<void> } | undefined;
  onMount(async () => {
    try {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
      };
      lock = await nav.wakeLock?.request("screen");
    } catch {
      lock = undefined;
    }
  });
  onCleanup(() => void lock?.release().catch(() => undefined));
}

/**
 * One screen per row of the recipe. Parallel steps show as tabs, a "pick one" split as a
 * choice. Timers start from a step and keep their label when you move on.
 */
export function CookMode(props: { draft: RecipeDraft; cooks: number; catalog: Catalog }) {
  useWakeLock();
  const rows = createMemo(() => lanes(props.draft.nodes, props.draft.edges));
  const [index, setIndex] = createSignal(0);
  const [direction, setDirection] = createSignal(1);
  const [done, setDone] = createStore<Record<string, boolean>>({});
  const [timers, setTimers] = createSignal<Timer[]>([]);
  const [now, setNow] = createSignal(Date.now());
  let nextTimerId = 1;
  const tick = setInterval(() => setNow(Date.now()), 500);
  onCleanup(() => clearInterval(tick));

  const row = () => rows()[index()] ?? [];
  const go = (delta: number) => {
    const target = Math.min(rows().length - 1, Math.max(0, index() + delta));
    setDirection(delta);
    setIndex(target);
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

  return (
    <div class="flex flex-col gap-4">
      <Show when={timers().length > 0}>
        <ul
          class="sticky top-0 z-20 -mx-4 flex flex-wrap gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
          aria-label="Timers"
        >
          <For each={timers()}>
            {(timer) => (
              <li
                class={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
                  remaining(timer) <= 0
                    ? "border-destructive bg-destructive/10 font-semibold"
                    : "border-border"
                )}
                role="timer"
              >
                <IconClock size={16} aria-hidden="true" />
                <span class="font-semibold tabular-nums">
                  {remaining(timer) <= 0 ? "Done" : formatClock(remaining(timer))}
                </span>
                <span class="max-w-40 truncate text-muted-foreground">{timer.label}</span>
                <button
                  type="button"
                  class="rounded-full p-0.5 hover:bg-muted"
                  aria-label={`Stop timer ${timer.label}`}
                  onClick={() => setTimers((list) => list.filter((item) => item.id !== timer.id))}
                >
                  <IconX size={14} aria-hidden="true" />
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <div
        class="flex items-center justify-center gap-1.5"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={rows().length}
        aria-valuenow={index() + 1}
        aria-label="Progress"
      >
        <For each={rows()}>
          {(_, at) => (
            <button
              type="button"
              aria-label={`Go to part ${at() + 1}`}
              class={cn(
                "h-2.5 rounded-full transition-all",
                at() === index()
                  ? "w-8 bg-primary"
                  : at() < index()
                    ? "w-2.5 bg-primary/60"
                    : "w-2.5 bg-border"
              )}
              onClick={() => {
                setDirection(at() > index() ? 1 : -1);
                setIndex(at());
              }}
            />
          )}
        </For>
      </div>

      <div class="relative min-h-[50vh] overflow-hidden">
        <AnimatePresence each={[index()]} by={(value) => value} mode="wait">
          {() => (
            <motion.section
              initial={{ opacity: 0, x: direction() * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction() * -40 }}
              transition={{ duration: 0.18 }}
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
                      />
                    )}
                  </Show>
                }
              >
                <Tabs defaultValue={row()[0]?.key}>
                  <span class="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <Dynamic
                      component={rowMode(row()) === "xor" ? IconArrowsShuffle : IconGitBranch}
                      size={18}
                      aria-hidden="true"
                    />
                    {rowMode(row()) === "xor" ? "Pick one" : "Do these at the same time"}
                  </span>
                  <TabsList class="w-full">
                    <For each={row()}>
                      {(node) => (
                        <TabsTrigger value={node.key} class="gap-1.5 text-sm">
                          <Show when={done[node.key]}>
                            <IconCheck size={16} aria-hidden="true" />
                          </Show>
                          {node.title}
                        </TabsTrigger>
                      )}
                    </For>
                  </TabsList>
                  <For each={row()}>
                    {(node) => (
                      <TabsContent value={node.key} class="pt-4">
                        <CookStep
                          node={node}
                          {...props}
                          done={done}
                          setDone={setDone}
                          onTimer={startTimer}
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

      <div class="sticky bottom-0 -mx-4 flex items-center justify-between gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Button
          type="button"
          variant="outline"
          size="lg"
          class="h-12 px-5 text-base"
          disabled={index() === 0}
          onClick={() => go(-1)}
        >
          <IconChevronLeft aria-hidden="true" />
          Back
        </Button>
        <span class="text-sm text-muted-foreground tabular-nums">
          {index() + 1} / {rows().length}
        </span>
        <Button
          type="button"
          size="lg"
          class="h-12 px-5 text-base"
          disabled={index() >= rows().length - 1}
          onClick={() => go(1)}
        >
          Next
          <IconChevronRight aria-hidden="true" />
        </Button>
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
}) {
  const [got, setGot] = createStore<Record<number, boolean>>({});
  const scale = (qty: number | null | undefined) =>
    qty == null ? qty : scaleQty(qty, props.draft.cooks, props.cooks);
  return (
    <div class="flex flex-col gap-5">
      <h2 class="text-2xl leading-tight font-bold">
        {props.node.title}
        <Show when={props.node.repeatMin > 1}>
          <span class="ml-2 text-lg text-muted-foreground">×{props.node.repeatMin}</span>
        </Show>
      </h2>
      <Show when={props.node.ingredients.length > 0}>
        <ul class="flex flex-col gap-2" aria-label="Ingredients for this step">
          <For each={props.node.ingredients}>
            {(item) => (
              <li>
                <ItemChip
                  kind="ingredient"
                  class="min-h-12 w-full justify-start rounded-lg text-lg"
                  name={props.catalog.name("ingredient", item.ingredientId)}
                  qty={scale(item.qty)}
                  unit={item.unit}
                  optional={item.optional}
                  muted={got[item.ingredientId]}
                  role="checkbox"
                  aria-checked={got[item.ingredientId] ? "true" : "false"}
                  onClick={() => setGot(item.ingredientId, (value) => !value)}
                />
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.node.tools.length > 0}>
        <ul class="flex flex-wrap gap-2" aria-label="Tools for this step">
          <For each={props.node.tools}>
            {(item) => (
              <li>
                <ItemChip kind="tool" name={props.catalog.name("tool", item.toolId)} static />
              </li>
            )}
          </For>
        </ul>
      </Show>
      <Show when={props.node.spans.length > 0}>
        <div class="flex flex-wrap gap-2">
          <For each={props.node.spans}>
            {(span) => (
              <Button
                type="button"
                variant={span.kind === "wait" ? "outline" : "secondary"}
                size="lg"
                class={cn("h-12 gap-2 px-4 text-base", span.kind === "wait" && "border-dashed")}
                onClick={() =>
                  props.onTimer(`${props.node.title} · ${spanLabel[span.kind]}`, span.seconds)
                }
              >
                <IconPlayerPlay aria-hidden="true" />
                <Dynamic component={spanIcon[span.kind]} aria-hidden="true" />
                <span class="font-semibold tabular-nums">{formatDuration(span.seconds)}</span>
              </Button>
            )}
          </For>
        </div>
      </Show>
      <Show when={props.node.body.trim()}>
        <MarkdownView value={props.node.body} class="text-base" />
      </Show>
      <Button
        type="button"
        variant={props.done[props.node.key] ? "secondary" : "outline"}
        size="lg"
        class="h-12 w-fit px-5 text-base"
        aria-pressed={props.done[props.node.key] ? "true" : "false"}
        onClick={() => props.setDone(props.node.key, !props.done[props.node.key])}
      >
        <IconCheck aria-hidden="true" />
        {props.done[props.node.key] ? "Done" : "Mark done"}
      </Button>
    </div>
  );
}
