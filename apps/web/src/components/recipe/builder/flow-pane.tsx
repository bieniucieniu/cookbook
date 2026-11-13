import { IconPencil, IconTrash } from "@/components/icons";
import { Button } from "@/components/m3/button";
import { IconButton } from "@/components/m3/icon-button";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import type { RecipeDraft } from "@/lib/recipe-draft";
import type { GraphIssue } from "@/lib/recipe-graph";
import { createMemo, createSignal, For, Show } from "solid-js";
import { RecipeFlow } from "../recipe-flow";
import type { DraftActions } from "./actions";

/**
 * Optional: the whole recipe as nodes. The step list already places every step; this is for a
 * look at the shape or wiring by hand. Drag from a right dot to a left dot to wire two steps.
 */
export function FlowPane(props: {
  draft: RecipeDraft;
  actions: DraftActions;
  issues: GraphIssue[];
  onOpen: (key: string) => void;
}) {
  const [selected, setSelected] = createSignal<string>();
  const step = createMemo(() => props.draft.nodes.find((node) => node.key === selected()));
  const titleOf = (key: string) => props.draft.nodes.find((node) => node.key === key)?.title || key;
  const out = createMemo(() => props.draft.edges.filter((edge) => edge.from === selected()));

  return (
    <div class="flex flex-col gap-3">
      <p class="typescale-body-medium text-on-surface-variant">
        Drag from a step's right dot to another step's left dot. Select a line or step and press
        Delete to remove it.
      </p>
      <RecipeFlow
        draft={props.draft}
        issues={props.issues}
        editable
        class="h-[65vh] min-h-80"
        onSelect={setSelected}
        onConnect={(from, to) => props.actions.addEdge(from, to)}
        onRemoveEdge={(from, to) => props.actions.removeEdge(from, to)}
        onRemoveStep={(key) => props.actions.removeStep(key)}
        onBranchMode={(key, mode) => props.actions.setBranchMode(key, mode)}
      />
      <Show when={step()}>
        {(node) => (
          <section
            class="flex flex-col gap-4 border-t border-outline-variant pt-4"
            aria-label="Selected step"
          >
            <div class="flex items-center justify-between gap-2">
              <h2 class="flex-1 typescale-title-medium text-on-surface">
                {node().title || node().key}
              </h2>
              <Button variant="tonal" size="sm" onClick={() => props.onOpen(node().key)}>
                <IconPencil aria-hidden="true" />
                Edit step
              </Button>
              <Button
                variant="text"
                size="sm"
                class="text-error"
                onClick={() => props.actions.removeStep(node().key)}
              >
                <IconTrash aria-hidden="true" />
                Delete step
              </Button>
            </div>
            <Show
              when={out().length > 0}
              fallback={<p class="typescale-body-medium text-on-surface-variant">Last step.</p>}
            >
              <ul class="flex flex-col gap-2">
                <For each={out()}>
                  {(edge) => (
                    <li class="flex items-center gap-2">
                      <TextField
                        variant="outlined"
                        class="flex-1"
                        value={edge.label}
                        onChange={(value) => props.actions.setEdgeLabel(edge.from, edge.to, value)}
                      >
                        <TextFieldContainer>
                          <TextFieldLabel>Then {titleOf(edge.to)} · label</TextFieldLabel>
                          <TextFieldInput placeholder="Optional, e.g. if crispy" />
                        </TextFieldContainer>
                      </TextField>
                      <IconButton
                        aria-label={`Unlink ${titleOf(edge.to)}`}
                        onClick={() => props.actions.removeEdge(edge.from, edge.to)}
                      >
                        <IconTrash aria-hidden="true" />
                      </IconButton>
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
