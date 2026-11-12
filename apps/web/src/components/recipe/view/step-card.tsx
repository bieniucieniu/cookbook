import type { Catalog } from "@/lib/catalog";
import type { DraftNode } from "@/lib/recipe-draft";
import { scaleQty } from "@/lib/units";
import { cn } from "@/lib/utils";
import { For, type JSX, Show } from "solid-js";
import { MarkdownView } from "../markdown";
import { ItemChip, SpanBadge } from "../parts";

/**
 * One step as a card: number and name, then ingredients and tools side by side once the card
 * is 20rem wide, times below them, the note, and an optional footer (comments). Shared by the
 * list view and the graph view's step pane, so a step reads the same in both.
 */
export function StepCard(props: {
  node: DraftNode;
  number: number | undefined;
  catalog: Catalog;
  /** Cooks the recipe is written for, and cooks to scale amounts to. */
  draftCooks: number;
  cooks: number;
  footer?: JSX.Element;
  class?: string;
  /**
   * One of several "pick one" options. The header becomes a button that chooses this step.
   * Collapsed: another option was chosen, so only the header shows, quieter, as a button that
   * switches to this one.
   */
  choice?: { chosen: boolean; collapsed: boolean; onToggle: () => void };
}) {
  const scale = (qty: number | null | undefined) =>
    qty == null ? qty : scaleQty(qty, props.draftCooks, props.cooks);
  const swapText = (kind: "ingredient" | "tool", ids: number[]) =>
    ids.length === 0 ? "" : `or ${ids.map((id) => props.catalog.name(kind, id)).join(", ")}`;
  const collapsed = () => props.choice?.collapsed ?? false;
  const title = () => (
    <>
      <span
        class={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full typescale-label-large tabular-nums",
          collapsed()
            ? "bg-surface-container-highest text-on-surface-variant"
            : "bg-primary text-on-primary"
        )}
        aria-hidden="true"
      >
        {props.number}
      </span>
      <span
        class={collapsed() ? "typescale-title-small" : "typescale-title-medium text-on-surface"}
      >
        {props.node.title}
        <Show when={props.node.repeatMin > 1}>
          <span class="ml-2 typescale-label-large text-on-surface-variant">
            ×{props.node.repeatMin}
          </span>
        </Show>
      </span>
    </>
  );
  return (
    <article
      class={cn(
        "@container flex flex-col gap-3 rounded-large motion-default",
        collapsed()
          ? "bg-surface-container-lowest p-2 text-on-surface-variant"
          : "bg-surface-container-low p-4",
        props.choice?.chosen && "ring-2 ring-primary",
        props.class
      )}
    >
      <Show
        when={props.choice}
        fallback={
          <header class="flex items-center gap-3">
            <h3 class="flex items-center gap-3">{title()}</h3>
          </header>
        }
      >
        {(choice) => (
          <h3>
            <button
              type="button"
              aria-pressed={choice().chosen}
              aria-label={
                choice().chosen
                  ? `${props.node.title}, chosen. Show all options`
                  : collapsed()
                    ? `Choose ${props.node.title} instead`
                    : `Choose ${props.node.title}`
              }
              class="relative flex w-full cursor-pointer items-center gap-3 rounded-medium p-1 text-left state-layer focus-ring"
              onClick={() => choice().onToggle()}
            >
              {title()}
              {/* Radio mark: the choice reads as one of a set, not a toggle on each card. */}
              <span
                class={cn(
                  "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  choice().chosen ? "border-primary" : "border-outline"
                )}
                aria-hidden="true"
              >
                <Show when={choice().chosen}>
                  <span class="size-2.5 rounded-full bg-primary" />
                </Show>
              </span>
            </button>
          </h3>
        )}
      </Show>
      <Show
        when={
          !collapsed() &&
          props.node.ingredients.length + props.node.tools.length + props.node.spans.length > 0
        }
      >
        {/* Ingredients and tools side by side once the card has room; times below. */}
        <div class="flex flex-col gap-3">
          <Show when={props.node.ingredients.length + props.node.tools.length > 0}>
            <div class="grid gap-x-4 gap-y-3 @xs:grid-cols-2">
              <Show when={props.node.ingredients.length > 0}>
                <ul class="flex flex-col items-start gap-1.5" aria-label="Ingredients">
                  <For each={props.node.ingredients}>
                    {(item) => (
                      <li class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <ItemChip
                          kind="ingredient"
                          name={props.catalog.name("ingredient", item.ingredientId)}
                          qty={scale(item.qty)}
                          unit={item.unit}
                          optional={item.optional}
                          static
                        />
                        <Show when={(item.alts ?? []).length > 0}>
                          <span class="typescale-body-small text-on-surface-variant">
                            {swapText(
                              "ingredient",
                              (item.alts ?? []).map((alt) => alt.altIngredientId)
                            )}
                          </span>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
              <Show when={props.node.tools.length > 0}>
                <ul class="flex flex-col items-start gap-1.5 @xs:col-start-2" aria-label="Tools">
                  <For each={props.node.tools}>
                    {(item) => (
                      <li class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <ItemChip
                          kind="tool"
                          name={props.catalog.name("tool", item.toolId)}
                          optional={item.optional}
                          static
                        />
                        <Show when={(item.alts ?? []).length > 0}>
                          <span class="typescale-body-small text-on-surface-variant">
                            {swapText(
                              "tool",
                              (item.alts ?? []).map((alt) => alt.altToolId)
                            )}
                          </span>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
          </Show>
          <Show when={props.node.spans.length > 0}>
            <div class="flex flex-wrap gap-2" aria-label="Time">
              <For each={props.node.spans}>
                {(span) => <SpanBadge kind={span.kind} seconds={span.seconds} static />}
              </For>
            </div>
          </Show>
        </div>
      </Show>
      <Show when={!collapsed() && props.node.body.trim()}>
        <MarkdownView value={props.node.body} class="text-on-surface-variant" />
      </Show>
      <Show when={!collapsed()}>{props.footer}</Show>
    </article>
  );
}
