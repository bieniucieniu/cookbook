import { IconArrowsShuffle, IconGitBranch, IconLayoutList } from "@/components/icons";
import { AnimatePresence, motion } from "@/components/motion";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import type { Catalog } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import { createMemo, Index, Show } from "solid-js";
import type { DraftActions } from "./actions";
import { StepCard } from "./step-card";
import { StepComposer } from "./step-composer";

/** A thread of step cards. Steps that run side by side share a row. */
export function StepsStage(props: { draft: RecipeDraft; actions: DraftActions; catalog: Catalog }) {
  const rows = createMemo(() => lanes(props.draft.nodes, props.draft.edges));
  const numbers = createMemo(() => {
    const result = new Map<string, number>();
    let next = 1;
    for (const row of rows()) for (const node of row) result.set(node.key, next++);
    return result;
  });
  /** Mode of the split that opens a row of parallel steps. */
  const rowMode = (row: { key: string }[]) => {
    const firstKey = row[0]?.key;
    const parent = props.draft.edges.find((edge) => edge.to === firstKey)?.from;
    return props.draft.nodes.find((node) => node.key === parent)?.branchMode === "xor"
      ? "xor"
      : "and";
  };

  const scrollTo = (key: string) =>
    requestAnimationFrame(() =>
      document
        .getElementById(`step-${key}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    );

  return (
    <div class="flex flex-col gap-4">
      <Show
        when={props.draft.nodes.length > 0}
        fallback={
          <Empty class="border border-dashed py-10">
            <EmptyHeader>
              <IconLayoutList
                size={32}
                stroke={1.5}
                aria-hidden="true"
                class="mx-auto text-muted-foreground"
              />
              <EmptyTitle>No steps yet</EmptyTitle>
              <EmptyDescription>
                Type a short name below, like “Chop”, then add what it uses.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        <ol class="flex flex-col gap-3">
          <Index each={rows()}>
            {(row, rowIndex) => (
              <li class="flex flex-col gap-1">
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
                <div
                  class={
                    row().length > 1 ? "flex gap-3 overflow-x-auto pb-1 [&>*]:min-w-72" : "flex"
                  }
                >
                  <AnimatePresence each={row()} by={(node) => node.key}>
                    {(node) => (
                      <motion.div
                        class="flex min-w-0 flex-1"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.18 }}
                      >
                        <StepCard
                          node={node}
                          number={numbers().get(node.key) ?? 0}
                          draft={props.draft}
                          actions={props.actions}
                          catalog={props.catalog}
                          first={node.ord === 0}
                          last={node.ord === props.draft.nodes.length - 1}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <Show when={rowIndex < rows().length - 1}>
                  <span class="mx-auto h-3 w-px bg-border" aria-hidden="true" />
                </Show>
              </li>
            )}
          </Index>
        </ol>
      </Show>
      <div class="sticky bottom-20 z-10">
        <StepComposer
          draft={props.draft}
          actions={props.actions}
          catalog={props.catalog}
          onAdded={scrollTo}
        />
      </div>
    </div>
  );
}
