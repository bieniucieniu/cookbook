import {
  IconArrowsShuffle,
  IconCarrot,
  IconGitBranch,
  IconToolsKitchen2,
} from "@/components/icons";
import type { Catalog } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { lanes, stepNumbers } from "@/lib/recipe-graph";
import { summarize } from "@/lib/recipe-summary";
import { scaleQty } from "@/lib/units";
import type { CardVariant } from "@/components/m3/card";
import { FilterChip } from "@/components/m3/chip";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/m3/tabs";
import { createMemo, createSignal, For, Index, Match, Show, Switch, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { MarkdownView } from "../markdown";
import { IngredientList, IngredientListItem } from "./ingredient-list";
import { StepCard } from "./step-card";
import { StepCarousel } from "./step-carousel";
import { IconLabel } from "../parts";

/** Side-by-side rows are on unless the reader turned them off on this device. */
const sideBySideKey = "cookbook:side-by-side";

function loadSideBySide(): boolean {
  try {
    return localStorage.getItem(sideBySideKey) !== "off";
  } catch {
    return true;
  }
}

/**
 * Readable width for one step (about what the page allowed before it went full width): full
 * width up to the cap. The list centers it. Side-by-side rows do not use it and span the column.
 */
const stepWidth = "w-full max-w-[50rem]";

/**
 * Everything on one page: a checklist of what to get out, then compact steps with their own
 * items. Check marks live for this visit only. `stepAction` fills the top right of each step
 * card (the route puts a link to that step in cook mode there).
 */
export function RecipeList(props: {
  draft: RecipeDraft;
  cooks: number;
  catalog: Catalog;
  stepAction?: (node: RecipeDraft["nodes"][number]) => JSX.Element;
}) {
  const [checked, setChecked] = createStore<Record<string, boolean>>({});
  const [sideBySide, setSideBySide] = createSignal(loadSideBySide());
  const toggleSideBySide = (on: boolean) => {
    setSideBySide(on);
    try {
      localStorage.setItem(sideBySideKey, on ? "on" : "off");
    } catch {
      return;
    }
  };
  const scale = (qty: number | null | undefined) =>
    qty == null ? qty : scaleQty(qty, props.draft.cooks, props.cooks);
  const rows = createMemo(() => lanes(props.draft.nodes, props.draft.edges));
  const summary = createMemo(() => summarize(props.draft));
  const numbers = createMemo(() => stepNumbers(props.draft.nodes, props.draft.edges));
  const rowMode = (row: { key: string }[]) => {
    const parent = props.draft.edges.find((edge) => edge.to === row[0]?.key)?.from;
    return props.draft.nodes.find((node) => node.key === parent)?.branchMode === "xor"
      ? "xor"
      : "and";
  };

  /** The side-by-side switch only matters for rows done at the same time. */
  const hasRows = () => rows().some((row) => row.length > 1 && rowMode(row) === "and");
  const card = (node: RecipeDraft["nodes"][number], variant?: CardVariant) => (
    <StepCard
      variant={variant}
      node={node}
      number={numbers().get(node.key)}
      catalog={props.catalog}
      draftCooks={props.draft.cooks}
      cooks={props.cooks}
      action={props.stepAction?.(node)}
      class="w-full"
    />
  );

  return (
    <div class="grid gap-8 expanded:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] expanded:items-start">
      {/* The checklist scrolls with the page, next to the steps. No scroll area of its own. */}
      <aside aria-label="What you need">
        <div class="flex flex-col gap-6">
          <section class="flex flex-col gap-3">
            <h2 class="typescale-title-medium text-on-surface">
              <IconLabel icon={IconCarrot} label="Ingredients" />
            </h2>
            <Show
              when={summary().ingredients.length > 0}
              fallback={<p class="typescale-body-medium text-on-surface-variant">None listed.</p>}
            >
              <IngredientList aria-label="Ingredients">
                <For each={summary().ingredients}>
                  {(line) => (
                    <For each={line.amounts}>
                      {(amount) => {
                        const id = `${line.id}:${amount.unit ?? ""}`;
                        return (
                          <IngredientListItem
                            name={props.catalog.name("ingredient", line.id)}
                            qty={scale(amount.qty)}
                            unit={amount.unit}
                            optional={line.optional}
                            alts={line.alts.map((alt) => props.catalog.name("ingredient", alt.id))}
                            checked={checked[id] ?? false}
                            onChange={(value) => setChecked(id, value)}
                          />
                        );
                      }}
                    </For>
                  )}
                </For>
              </IngredientList>
            </Show>
          </section>
          <Show when={summary().tools.length > 0}>
            <section class="flex flex-col gap-3">
              <h2 class="typescale-title-medium text-on-surface">
                <IconLabel icon={IconToolsKitchen2} label="Tools" />
              </h2>
              <IngredientList aria-label="Tools">
                <For each={summary().tools}>
                  {(line) => (
                    <IngredientListItem
                      name={props.catalog.name("tool", line.id)}
                      optional={line.optional}
                      alts={line.alts.map((alt) => props.catalog.name("tool", alt.id))}
                      checked={checked[`tool:${line.id}`] ?? false}
                      onChange={(value) => setChecked(`tool:${line.id}`, value)}
                    />
                  )}
                </For>
              </IngredientList>
            </section>
          </Show>
          <Show when={props.draft.notes.trim()}>
            <section class="flex flex-col gap-2">
              <h2 class="typescale-title-medium text-on-surface">Tips</h2>
              <MarkdownView value={props.draft.notes} />
            </section>
          </Show>
        </div>
      </aside>

      {/* The column and the list are full width; each single step caps itself and centers. */}
      <div class="flex w-full min-w-0 flex-col items-center gap-4">
        <Show when={hasRows()}>
          <div class={`flex justify-end ${stepWidth}`}>
            <FilterChip pressed={sideBySide()} onChange={toggleSideBySide}>
              Side by side
            </FilterChip>
          </div>
        </Show>
        {/* Each step is a card; rows and the steps inside a row are split by gaps. */}
        <ol class="flex w-full flex-col items-center gap-6">
          <Index each={rows()}>
            {(row) => (
              <li class={row().length > 1 ? "flex w-full flex-col gap-2" : stepWidth}>
                <Switch>
                  <Match when={row().length === 1}>{card(row()[0]!)}</Match>
                  {/* Pick one: the options are tabs, one filled card at a time. */}
                  <Match when={rowMode(row()) === "xor"}>
                    <div class={`flex flex-col gap-2 self-center ${stepWidth}`}>
                      <RowLabel mode="xor" />
                      <Tabs variant="secondary" defaultValue={row()[0]?.key}>
                        <TabsList aria-label="Steps to pick from">
                          <For each={row()}>
                            {(node) => <TabsTrigger value={node.key}>{node.title}</TabsTrigger>}
                          </For>
                          <TabsIndicator />
                        </TabsList>
                        <For each={row()}>
                          {(node) => (
                            <TabsContent value={node.key} class="pt-3">
                              {card(node, "filled")}
                            </TabsContent>
                          )}
                        </For>
                      </Tabs>
                    </div>
                  </Match>
                  {/* At the same time: elevated cards side by side, or stacked. */}
                  <Match when={sideBySide()}>
                    <StepCarousel
                      each={row()}
                      label={<RowLabel mode="and" />}
                      name="Steps to do at the same time"
                    >
                      {(node) => card(node, "elevated")}
                    </StepCarousel>
                  </Match>
                  <Match when>
                    <div class={`flex flex-col gap-2 self-center ${stepWidth}`}>
                      <RowLabel mode="and" />
                      <div class="flex flex-col gap-3">
                        <For each={row()}>{(node) => card(node, "elevated")}</For>
                      </div>
                    </div>
                  </Match>
                </Switch>
              </li>
            )}
          </Index>
        </ol>
      </div>
    </div>
  );
}

/** "At the same time" for parallel arms, "Pick one" for alternatives. */
function RowLabel(props: { mode: "and" | "xor" }) {
  return (
    <span class="inline-flex items-center gap-1.5 typescale-label-large text-on-surface-variant">
      <Show
        when={props.mode === "xor"}
        fallback={
          <>
            <IconGitBranch size={16} aria-hidden="true" />
            At the same time
          </>
        }
      >
        <IconArrowsShuffle size={16} aria-hidden="true" />
        Pick one
      </Show>
    </span>
  );
}
