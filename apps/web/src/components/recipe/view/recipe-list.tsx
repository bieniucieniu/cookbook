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
import { FilterChip } from "@/components/m3/chip";
import { createMemo, createSignal, For, Index, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { MarkdownView } from "../markdown";
import { IngredientList, IngredientListItem } from "./ingredient-list";
import { StepCard } from "./step-card";
import { growItem, StepCarousel } from "./step-carousel";
import { IconLabel, ItemChip } from "../parts";

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
 * items. Check marks live for this visit only.
 */
export function RecipeList(props: { draft: RecipeDraft; cooks: number; catalog: Catalog }) {
  const [checked, setChecked] = createStore<Record<string, boolean>>({});
  const [sideBySide, setSideBySide] = createSignal(loadSideBySide());
  /** The option chosen in each "pick one" row, keyed by the row's step keys. This visit only. */
  const [chosen, setChosen] = createStore<Record<string, string | undefined>>({});
  const rowKey = (row: { key: string }[]) => row.map((node) => node.key).join("|");
  const choose = (row: { key: string }[], key: string) =>
    setChosen(rowKey(row), (current) => (current === key ? undefined : key));
  /** Pick-one rows get choice cards; once one is chosen the others collapse. */
  const choiceFor = (row: { key: string }[], key: string) => {
    if (rowMode(row) !== "xor") return undefined;
    const picked = chosen[rowKey(row)];
    return {
      chosen: picked === key,
      collapsed: picked !== undefined && picked !== key,
      onToggle: () => choose(row, key),
    };
  };
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
  const swapText = (kind: "ingredient" | "tool", ids: number[]) =>
    ids.length === 0 ? "" : `or ${ids.map((id) => props.catalog.name(kind, id)).join(", ")}`;
  const numbers = createMemo(() => stepNumbers(props.draft.nodes, props.draft.edges));
  const rowMode = (row: { key: string }[]) => {
    const parent = props.draft.edges.find((edge) => edge.to === row[0]?.key)?.from;
    return props.draft.nodes.find((node) => node.key === parent)?.branchMode === "xor"
      ? "xor"
      : "and";
  };

  const hasRows = () => rows().some((row) => row.length > 1);
  const card = (
    node: RecipeDraft["nodes"][number],
    choice?: { chosen: boolean; collapsed: boolean; onToggle: () => void }
  ) => (
    <StepCard
      choice={choice}
      node={node}
      number={numbers().get(node.key)}
      catalog={props.catalog}
      draftCooks={props.draft.cooks}
      cooks={props.cooks}
      class="w-full"
    />
  );

  return (
    <div class="grid gap-8 expanded:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] expanded:items-start">
      {/*
        From the expanded breakpoint the checklist sticks under the app bar and scrolls on its
        own: viewport height minus the bar (--app-bar-height) and a 1rem gap above and below.
      */}
      <aside
        aria-label="What you need"
        class="expanded:sticky expanded:top-[calc(var(--app-bar-height)+1rem)]"
      >
        {/*
          Not the m3 ScrollArea: its overflow and overscroll-contain apply at every width. On a
          phone the panel is part of the page and must not catch the swipe, so the scroll
          container only exists from the expanded breakpoint, where the panel sticks.
        */}
        <div class="flex flex-col gap-6 expanded:max-h-[calc(100dvh-var(--app-bar-height)-2rem)] expanded:overflow-y-auto expanded:overscroll-contain expanded:pr-2 expanded:[scrollbar-color:var(--md-sys-color-outline)_transparent] expanded:[scrollbar-width:thin]">
          <section class="flex flex-col gap-3">
            <h2 class="typescale-title-medium text-on-surface">
              <IconLabel icon={IconCarrot} label="Ingredients" />
            </h2>
            <Show
              when={summary().ingredients.length > 0}
              fallback={<p class="typescale-body-medium text-on-surface-variant">None listed.</p>}
            >
              <IngredientList aria-label="Ingredients" class="-mx-4">
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
              <ul class="flex flex-wrap gap-2">
                <For each={summary().tools}>
                  {(line) => (
                    <li class="flex flex-col gap-1">
                      <ItemChip
                        kind="tool"
                        name={props.catalog.name("tool", line.id)}
                        optional={line.optional}
                        muted={checked[`tool:${line.id}`]}
                        role="checkbox"
                        aria-checked={checked[`tool:${line.id}`] ? "true" : "false"}
                        onClick={() => setChecked(`tool:${line.id}`, (value) => !value)}
                      />
                      <Show when={line.alts.length > 0}>
                        <span class="pl-3 typescale-body-small text-on-surface-variant">
                          {swapText(
                            "tool",
                            line.alts.map((alt) => alt.id)
                          )}
                        </span>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
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
        <ol class="flex w-full flex-col items-center gap-4">
          <Index each={rows()}>
            {(row) => (
              <li class={row().length > 1 ? "flex w-full flex-col gap-2" : stepWidth}>
                <Show when={row().length > 1} fallback={card(row()[0]!)}>
                  <Show
                    when={sideBySide()}
                    fallback={
                      <div class={`flex flex-col gap-2 self-center ${stepWidth}`}>
                        <RowLabel mode={rowMode(row())} />
                        <For each={row()}>{(node) => card(node, choiceFor(row(), node.key))}</For>
                      </div>
                    }
                  >
                    <StepCarousel
                      each={row()}
                      itemClass={(node) =>
                        choiceFor(row(), node.key)?.collapsed
                          ? "w-[min(14rem,60%)] flex-none self-start"
                          : growItem
                      }
                      label={<RowLabel mode={rowMode(row())} />}
                      name={
                        rowMode(row()) === "xor"
                          ? "Steps to pick from"
                          : "Steps to do at the same time"
                      }
                    >
                      {(node) => card(node, choiceFor(row(), node.key))}
                    </StepCarousel>
                  </Show>
                </Show>
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
