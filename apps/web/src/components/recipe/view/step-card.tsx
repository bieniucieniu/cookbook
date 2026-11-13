import type { Catalog } from "@/lib/catalog";
import type { DraftNode } from "@/lib/recipe-draft";
import { formatAmount, scaleQty } from "@/lib/units";
import { cn } from "@/lib/utils";
import { For, type JSX, Show } from "solid-js";
import { MarkdownView } from "../markdown";
import { IconCarrot, IconToolsKitchen2, type TablerIcon } from "@/components/icons";
import {
  List,
  ListItem,
  ListItemContent,
  ListItemHeadline,
  ListItemLeading,
  ListItemSupportingText,
} from "@/components/m3/list";
import { Dynamic } from "solid-js/web";
import { SpanBadge } from "../parts";

/**
 * One step as a card: number and name, then ingredients and tools side by side once the card
 * is 20rem wide, times below them, and the note. Used by the list view. `action` sits at the
 * top right of the header (the list puts a link to the step in cook mode there).
 */
export function StepCard(props: {
  node: DraftNode;
  number: number | undefined;
  catalog: Catalog;
  /** Cooks the recipe is written for, and cooks to scale amounts to. */
  draftCooks: number;
  cooks: number;
  class?: string;
  /** Top right of the header. Hidden while the card is a collapsed choice. */
  action?: JSX.Element;
  /**
   * One of several "pick one" options. The header becomes a button that chooses this step.
   * Collapsed: another option was chosen, so only the header shows, quieter, as a button that
   * switches to this one.
   */
  choice?: { chosen: boolean; collapsed: boolean; onToggle: () => void };
}) {
  const scale = (qty: number | null | undefined) =>
    qty == null ? qty : scaleQty(qty, props.draftCooks, props.cooks);
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
      <header class="flex items-center gap-2">
        <Show
          when={props.choice}
          fallback={<h3 class="flex min-w-0 flex-1 items-center gap-3">{title()}</h3>}
        >
          {(choice) => (
            <h3 class="min-w-0 flex-1">
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
        <Show when={!collapsed() && props.action}>{props.action}</Show>
      </header>
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
                <List aria-label="Ingredients" class="py-0">
                  <For each={props.node.ingredients}>
                    {(item) => (
                      <StepItem
                        icon={IconCarrot}
                        name={props.catalog.name("ingredient", item.ingredientId)}
                        amount={formatAmount(scale(item.qty), item.unit)}
                        optional={item.optional}
                        alts={(item.alts ?? []).map((alt) =>
                          props.catalog.name("ingredient", alt.altIngredientId)
                        )}
                      />
                    )}
                  </For>
                </List>
              </Show>
              <Show when={props.node.tools.length > 0}>
                <List aria-label="Tools" class="py-0 @xs:col-start-2">
                  <For each={props.node.tools}>
                    {(item) => (
                      <StepItem
                        icon={IconToolsKitchen2}
                        name={props.catalog.name("tool", item.toolId)}
                        optional={item.optional}
                        alts={(item.alts ?? []).map((alt) =>
                          props.catalog.name("tool", alt.altToolId)
                        )}
                      />
                    )}
                  </For>
                </List>
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
    </article>
  );
}

/**
 * One ingredient or tool in a step: icon, amount and name, and "optional" and swaps as
 * supporting text. No side padding, so the icons line up with the card's content edge.
 */
function StepItem(props: {
  icon: TablerIcon;
  name: string;
  amount?: string;
  optional?: boolean;
  alts: string[];
}) {
  const supporting = () =>
    [props.optional ? "optional" : "", props.alts.length > 0 ? `or ${props.alts.join(", ")}` : ""]
      .filter(Boolean)
      .join(" · ");
  return (
    <ListItem class="px-0">
      <ListItemLeading class="text-primary">
        <Dynamic component={props.icon} stroke={1.75} aria-hidden="true" />
      </ListItemLeading>
      <ListItemContent>
        <ListItemHeadline>
          <Show when={props.amount}>
            <span class="font-semibold tabular-nums">{props.amount} </span>
          </Show>
          {props.name}
        </ListItemHeadline>
        <Show when={supporting()}>
          <ListItemSupportingText>{supporting()}</ListItemSupportingText>
        </Show>
      </ListItemContent>
    </ListItem>
  );
}
