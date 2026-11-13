import { IconCarrot, IconToolsKitchen2 } from "@/components/icons";
import { List } from "@/components/m3/list";
import type { Catalog } from "@/lib/catalog";
import type { DraftNode } from "@/lib/recipe-draft";
import { formatDuration, scaleAmount } from "@/lib/units";
import { cn } from "@/lib/utils";
import { For, type JSX, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import { MarkdownView } from "../markdown";
import { SpanBadge, spanLabel, StepNumber } from "../parts";
import { ItemRow } from "./item-row";

/**
 * One step, as the list view and cook mode show it. No card: the page (or the cook slide) is
 * the surface, and the list splits steps with dividers.
 *
 * `compact` (list view): number, name, and `action` in a row; ingredients and tools side by side
 * once there is 20rem, then times, then the note. `large` (cook mode): a big title; what you
 * need on the left and what to do on the right once there is 48rem, stacked below that.
 *
 * `checkable` turns ingredient and tool rows into a checklist (state lives for this mount, one
 * check per row). `onTimer` turns the times into buttons that start a timer.
 */
export function StepView(props: {
  node: DraftNode;
  catalog: Catalog;
  /** Cooks the recipe is written for, and cooks to scale amounts to. */
  draftCooks: number;
  cooks: number;
  number?: number;
  size?: "compact" | "large";
  /** Top right of the header. */
  action?: JSX.Element;
  checkable?: boolean;
  onTimer?: (label: string, seconds: number) => void;
  /** Under the note, in the "what to do" column. */
  footer?: JSX.Element;
  class?: string;
}) {
  const large = () => props.size === "large";
  const [checked, setChecked] = createStore<Record<string, boolean>>({});
  const isChecked = (key: string) => (props.checkable ? (checked[key] ?? false) : undefined);
  const toggle = (key: string) =>
    props.checkable ? (value: boolean) => setChecked(key, value) : undefined;
  const needs = () => props.node.ingredients.length + props.node.tools.length > 0;

  return (
    <article class={cn("@container flex flex-col", large() ? "gap-5" : "gap-3", props.class)}>
      <header class="flex items-center gap-3">
        <Show when={props.number !== undefined}>
          <StepNumber value={props.number} />
        </Show>
        <Dynamic
          component={large() ? "h2" : "h3"}
          class={cn(
            "min-w-0 flex-1 text-on-surface",
            large() ? "typescale-emphasized-headline-large" : "typescale-title-medium"
          )}
        >
          {props.node.title}
          <Show when={props.node.repeatMin > 1}>
            <span
              class={cn(
                "ml-2 text-on-surface-variant",
                large() ? "typescale-title-large" : "typescale-label-large"
              )}
            >
              ×{props.node.repeatMin}
            </span>
          </Show>
        </Dynamic>
        <Show when={props.action}>{props.action}</Show>
      </header>

      <div
        class={cn(
          "grid gap-x-8 text-on-surface",
          large()
            ? "gap-y-5 @3xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @3xl:items-start"
            : "gap-y-3"
        )}
      >
        <Show when={needs()}>
          <div class={cn("grid gap-x-4 gap-y-3", !large() && "@xs:grid-cols-2")}>
            <Show when={props.node.ingredients.length > 0}>
              <List aria-label="Ingredients for this step" class="py-0">
                <For each={props.node.ingredients}>
                  {(item, at) => (
                    <ItemRow
                      icon={IconCarrot}
                      name={props.catalog.name("ingredient", item.ingredientId)}
                      qty={scaleAmount(item.qty, props.draftCooks, props.cooks)}
                      unit={item.unit}
                      optional={item.optional}
                      alts={(item.alts ?? []).map((alt) =>
                        props.catalog.name("ingredient", alt.altIngredientId)
                      )}
                      checked={isChecked(`ingredient:${at()}`)}
                      onChange={toggle(`ingredient:${at()}`)}
                    />
                  )}
                </For>
              </List>
            </Show>
            <Show when={props.node.tools.length > 0}>
              <List
                aria-label="Tools for this step"
                class={cn("py-0", !large() && "@xs:col-start-2")}
              >
                <For each={props.node.tools}>
                  {(item, at) => (
                    <ItemRow
                      icon={IconToolsKitchen2}
                      name={props.catalog.name("tool", item.toolId)}
                      optional={item.optional}
                      alts={(item.alts ?? []).map((alt) =>
                        props.catalog.name("tool", alt.altToolId)
                      )}
                      checked={isChecked(`tool:${at()}`)}
                      onChange={toggle(`tool:${at()}`)}
                    />
                  )}
                </For>
              </List>
            </Show>
          </div>
        </Show>

        <div class={cn("flex min-w-0 flex-col", large() ? "gap-5 @3xl:col-start-2" : "gap-3")}>
          <Show when={props.node.spans.length > 0}>
            <div
              class={cn("flex flex-wrap gap-2", large() && "order-1")}
              aria-label={props.onTimer ? "Timers for this step" : "Time"}
            >
              <For each={props.node.spans}>
                {(span) => (
                  <Show
                    when={props.onTimer}
                    fallback={<SpanBadge kind={span.kind} seconds={span.seconds} static />}
                  >
                    {(onTimer) => (
                      <SpanBadge
                        kind={span.kind}
                        seconds={span.seconds}
                        play
                        aria-label={`Start a ${formatDuration(span.seconds)} ${spanLabel[span.kind].toLowerCase()} timer`}
                        onClick={() =>
                          onTimer()(`${props.node.title} · ${spanLabel[span.kind]}`, span.seconds)
                        }
                      />
                    )}
                  </Show>
                )}
              </For>
            </div>
          </Show>
          <Show when={props.node.body.trim()}>
            <MarkdownView
              value={props.node.body}
              class={large() ? "typescale-body-large" : "text-on-surface-variant"}
            />
          </Show>
          <Show when={props.footer}>
            <div class="order-2 flex min-w-0 flex-col gap-5">{props.footer}</div>
          </Show>
        </div>
      </div>
    </article>
  );
}
