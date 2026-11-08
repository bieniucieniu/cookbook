import { IconTrash } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input, InputControl, InputLabel } from "@/components/ui/input";
import type { RecipeDraft } from "@/lib/recipe-draft";
import type { GraphIssue } from "@/lib/recipe-graph";
import { createMemo, createSignal, For, Show } from "solid-js";
import { RecipeFlow } from "../recipe-flow";
import type { DraftActions } from "./actions";

/** The whole recipe as nodes. Drag from a right dot to a left dot to wire two steps. */
export function FlowStage(props: {
  draft: RecipeDraft;
  actions: DraftActions;
  issues: GraphIssue[];
}) {
  const [selected, setSelected] = createSignal<string>();
  const step = createMemo(() => props.draft.nodes.find((node) => node.key === selected()));
  const titleOf = (key: string) => props.draft.nodes.find((node) => node.key === key)?.title || key;
  const out = createMemo(() => props.draft.edges.filter((edge) => edge.from === selected()));

  return (
    <div class="flex flex-col gap-3">
      <p class="text-sm text-muted-foreground">
        Drag from a step's right dot to another step's left dot. Select a line or step and press
        Delete to remove it.
      </p>
      <RecipeFlow
        draft={props.draft}
        issues={props.issues}
        editable
        class="h-[60vh] min-h-80"
        onSelect={setSelected}
        onConnect={(from, to) => props.actions.addEdge(from, to)}
        onRemoveEdge={(from, to) => props.actions.removeEdge(from, to)}
        onRemoveStep={(key) => props.actions.removeStep(key)}
        onBranchMode={(key, mode) => props.actions.setBranchMode(key, mode)}
      />
      <Show when={step()}>
        {(node) => (
          <section
            class="flex flex-col gap-3 rounded-xl border border-border p-3"
            aria-label="Selected step"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-base font-semibold">{node().title || node().key}</h2>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => props.actions.removeStep(node().key)}
              >
                <IconTrash aria-hidden="true" />
                Delete step
              </Button>
            </div>
            <Show
              when={out().length > 0}
              fallback={<p class="text-sm text-muted-foreground">Last step.</p>}
            >
              <ul class="flex flex-col gap-2">
                <For each={out()}>
                  {(edge) => (
                    <li class="flex items-end gap-2">
                      <Input
                        class="flex-1"
                        value={edge.label}
                        onChange={(value) => props.actions.setEdgeLabel(edge.from, edge.to, value)}
                      >
                        <InputLabel>Then {titleOf(edge.to)} · label</InputLabel>
                        <InputControl placeholder="Optional, e.g. if crispy" />
                      </Input>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-lg"
                        aria-label={`Unlink ${titleOf(edge.to)}`}
                        onClick={() => props.actions.removeEdge(edge.from, edge.to)}
                      >
                        <IconTrash aria-hidden="true" />
                      </Button>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </section>
        )}
      </Show>
    </div>
  );
}
