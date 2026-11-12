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
import { createMemo, For, Index, Show, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { MarkdownView } from "../markdown";
import { StepCard } from "./step-card";
import { IconLabel, ItemChip } from "../parts";

/**
 * Everything on one page: a checklist of what to get out, then compact steps with their own
 * items. Check marks live for this visit only.
 */
export function RecipeList(props: {
  draft: RecipeDraft;
  cooks: number;
  catalog: Catalog;
  stepFooter?: (stepKey: string) => JSX.Element;
}) {
  const [checked, setChecked] = createStore<Record<string, boolean>>({});
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

  return (
    <div class="grid gap-8 expanded:grid-cols-[minmax(0,20rem)_1fr]">
      <aside class="flex flex-col gap-6">
        <section class="flex flex-col gap-3">
          <h2 class="typescale-title-medium text-on-surface">
            <IconLabel icon={IconCarrot} label="Ingredients" />
          </h2>
          <ul class="flex flex-col gap-1.5">
            <For
              each={summary().ingredients}
              fallback={<li class="typescale-body-medium text-on-surface-variant">None listed.</li>}
            >
              {(line) => (
                <li class="flex flex-col gap-1">
                  <For each={line.amounts}>
                    {(amount) => {
                      const id = `${line.id}:${amount.unit ?? ""}`;
                      return (
                        <ItemChip
                          kind="ingredient"
                          class="w-full justify-start rounded-medium"
                          name={props.catalog.name("ingredient", line.id)}
                          qty={scale(amount.qty)}
                          unit={amount.unit}
                          optional={line.optional}
                          muted={checked[id]}
                          role="checkbox"
                          aria-checked={checked[id] ? "true" : "false"}
                          onClick={() => setChecked(id, (value) => !value)}
                        />
                      );
                    }}
                  </For>
                  <Show when={line.alts.length > 0}>
                    <span class="pl-3 typescale-body-small text-on-surface-variant">
                      {swapText(
                        "ingredient",
                        line.alts.map((alt) => alt.id)
                      )}
                    </span>
                  </Show>
                </li>
              )}
            </For>
          </ul>
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
      </aside>

      <ol class="flex flex-col gap-4">
        <Index each={rows()}>
          {(row) => (
            <li class="flex flex-col gap-2">
              <Show when={row().length > 1}>
                <span class="inline-flex items-center gap-1.5 typescale-label-large text-on-surface-variant">
                  <Show
                    when={rowMode(row()) === "xor"}
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
              </Show>
              <div class={row().length > 1 ? "grid gap-3 medium:grid-cols-2" : "flex flex-col"}>
                <For each={row()}>
                  {(node) => (
                    <StepCard
                      node={node}
                      number={numbers().get(node.key)}
                      catalog={props.catalog}
                      draftCooks={props.draft.cooks}
                      cooks={props.cooks}
                      footer={props.stepFooter?.(node.key)}
                    />
                  )}
                </For>
              </div>
            </li>
          )}
        </Index>
      </ol>
    </div>
  );
}
