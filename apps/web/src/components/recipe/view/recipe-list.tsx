import {
  IconArrowsShuffle,
  IconCarrot,
  IconGitBranch,
  IconToolsKitchen2,
} from "@/components/icons";
import type { Catalog } from "@/lib/catalog";
import { rollup, toolIds, type RecipeDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import { scaleQty } from "@/lib/units";
import { createMemo, For, Index, Show, type JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { MarkdownView } from "../markdown";
import { IconLabel, ItemChip, SpanBadge } from "../parts";

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
  const numbers = createMemo(() => {
    const result = new Map<string, number>();
    let next = 1;
    for (const row of rows()) for (const node of row) result.set(node.key, next++);
    return result;
  });
  const rowMode = (row: { key: string }[]) => {
    const parent = props.draft.edges.find((edge) => edge.to === row[0]?.key)?.from;
    return props.draft.nodes.find((node) => node.key === parent)?.branchMode === "xor"
      ? "xor"
      : "and";
  };

  return (
    <div class="grid gap-8 lg:grid-cols-[minmax(0,20rem)_1fr]">
      <aside class="flex flex-col gap-6">
        <section class="flex flex-col gap-3">
          <h2 class="text-base font-semibold">
            <IconLabel icon={IconCarrot} label="Ingredients" />
          </h2>
          <ul class="flex flex-col gap-1.5">
            <For
              each={rollup(props.draft)}
              fallback={<li class="text-sm text-muted-foreground">None listed.</li>}
            >
              {(line) => {
                const id = `${line.ingredientId}:${line.unit ?? ""}`;
                return (
                  <li>
                    <ItemChip
                      kind="ingredient"
                      class="w-full justify-start rounded-lg"
                      name={props.catalog.name("ingredient", line.ingredientId)}
                      qty={scale(line.qty)}
                      unit={line.unit}
                      optional={line.optional}
                      muted={checked[id]}
                      role="checkbox"
                      aria-checked={checked[id] ? "true" : "false"}
                      onClick={() => setChecked(id, (value) => !value)}
                    />
                  </li>
                );
              }}
            </For>
          </ul>
        </section>
        <Show when={toolIds(props.draft).length > 0}>
          <section class="flex flex-col gap-3">
            <h2 class="text-base font-semibold">
              <IconLabel icon={IconToolsKitchen2} label="Tools" />
            </h2>
            <ul class="flex flex-wrap gap-2">
              <For each={toolIds(props.draft)}>
                {(id) => (
                  <li>
                    <ItemChip
                      kind="tool"
                      name={props.catalog.name("tool", id)}
                      muted={checked[`tool:${id}`]}
                      role="checkbox"
                      aria-checked={checked[`tool:${id}`] ? "true" : "false"}
                      onClick={() => setChecked(`tool:${id}`, (value) => !value)}
                    />
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>
        <Show when={props.draft.notes.trim()}>
          <section class="flex flex-col gap-2">
            <h2 class="text-base font-semibold">Tips</h2>
            <MarkdownView value={props.draft.notes} />
          </section>
        </Show>
      </aside>

      <ol class="flex flex-col gap-4">
        <Index each={rows()}>
          {(row) => (
            <li class="flex flex-col gap-2">
              <Show when={row().length > 1}>
                <span class="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
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
              <div class={row().length > 1 ? "grid gap-3 sm:grid-cols-2" : "flex flex-col"}>
                <For each={row()}>
                  {(node) => (
                    <article class="flex flex-col gap-3 rounded-xl border border-border p-3">
                      <header class="flex items-center gap-3">
                        <span
                          class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground tabular-nums"
                          aria-hidden="true"
                        >
                          {numbers().get(node.key)}
                        </span>
                        <h3 class="text-base font-semibold">
                          {node.title}
                          <Show when={node.repeatMin > 1}>
                            <span class="ml-2 text-sm font-medium text-muted-foreground">
                              ×{node.repeatMin}
                            </span>
                          </Show>
                        </h3>
                      </header>
                      <Show
                        when={node.ingredients.length + node.tools.length + node.spans.length > 0}
                      >
                        <div class="flex flex-wrap gap-2">
                          <For each={node.ingredients}>
                            {(item) => (
                              <ItemChip
                                kind="ingredient"
                                name={props.catalog.name("ingredient", item.ingredientId)}
                                qty={scale(item.qty)}
                                unit={item.unit}
                                optional={item.optional}
                                static
                              />
                            )}
                          </For>
                          <For each={node.tools}>
                            {(item) => (
                              <ItemChip
                                kind="tool"
                                name={props.catalog.name("tool", item.toolId)}
                                static
                              />
                            )}
                          </For>
                          <For each={node.spans}>
                            {(span) => <SpanBadge kind={span.kind} seconds={span.seconds} static />}
                          </For>
                        </div>
                      </Show>
                      <Show when={node.body.trim()}>
                        <MarkdownView value={node.body} class="text-muted-foreground" />
                      </Show>
                      {props.stepFooter?.(node.key)}
                    </article>
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
