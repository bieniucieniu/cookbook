import {
  IconChevronLeft,
  IconDeviceFloppy,
  IconLayoutList,
  IconPlus,
  IconSitemap,
} from "@/components/icons";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  getGetRecipeQueryKey,
  getListRecipesQueryKey,
  useCreateRecipe,
  useUpdateRecipe,
} from "@/generated/recipes/recipes";
import { useCatalog } from "@/lib/catalog";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { draftToWrite, type RecipeDraft } from "@/lib/recipe-draft";
import { lanes, validateGraph } from "@/lib/recipe-graph";
import { summarize } from "@/lib/recipe-summary";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/solid-query";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { createDraftActions } from "./actions";
import { DetailsEditor } from "./details-editor";
import { FlowPane } from "./flow-pane";
import { ShareSheet } from "./share-sheet";
import { StepEditor } from "./step-editor";
import { SummaryPanel } from "./summary-panel";
import { draftWarnings, type Warning } from "./warnings";

export type EditorPane = "step" | "flow";

/**
 * Split view: the whole recipe on the left, one step (or the recipe details, or the optional
 * flow graph) on the right. On a phone the two sides take turns. The draft autosaves here.
 */
export function RecipeEditor(props: {
  initial: RecipeDraft;
  recipeId?: string;
  /** A step key, `details`, or nothing (first step). */
  selected?: string;
  pane: EditorPane;
  onSelect: (selection: string | undefined) => void;
  onPane: (pane: EditorPane) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const restored = loadDraft(props.recipeId);
  const [draft, setDraft] = createStore<RecipeDraft>(structuredClone(restored ?? props.initial));
  const [showRestored, setShowRestored] = createSignal(restored !== undefined);
  const [saveError, setSaveError] = createSignal<string>();
  const [generation, setGeneration] = createSignal(0);
  /** Phones only: which side is showing. */
  const [side, setSide] = createSignal<"summary" | "editor">("summary");
  const actions = createDraftActions(draft, setDraft);
  const create = useCreateRecipe();
  const update = useUpdateRecipe();

  createEffect(() => {
    const snapshot = JSON.stringify(draft);
    saveDraft(props.recipeId, JSON.parse(snapshot));
  });

  const issues = createMemo(() => validateGraph(draft.nodes, draft.edges));
  const summary = createMemo(() => summarize(draft));
  const warnings = createMemo(() => draftWarnings(draft, issues(), summary(), catalog));
  const blocking = () => warnings().filter((warning) => warning.blocking);
  const numbers = createMemo(() => {
    const result = new Map<string, number>();
    let next = 1;
    for (const row of lanes(draft.nodes, draft.edges))
      for (const node of row) result.set(node.key, next++);
    return result;
  });
  const pending = () => create.isPending || update.isPending;

  /** The step shown on the right: the one asked for, else the first. */
  const selection = createMemo(() => {
    const wanted = props.selected;
    if (wanted === "details") return "details";
    if (wanted && draft.nodes.some((node) => node.key === wanted)) return wanted;
    return draft.nodes[0]?.key;
  });

  const select = (next: string | undefined) => {
    props.onSelect(next);
    if (props.pane !== "step") props.onPane("step");
    setSide("editor");
    if (next && next !== "details") {
      requestAnimationFrame(() =>
        document
          .getElementById(`step-${next}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      );
    }
  };

  const fix = (warning: Warning) => {
    if (warning.target.kind === "step") {
      select(warning.target.key);
    } else if (warning.target.kind === "details") {
      select("details");
    } else {
      setSide("summary");
      document.getElementById("recipe-title")?.focus();
    }
  };

  const save = async () => {
    setSaveError(undefined);
    const first = blocking()[0];
    if (first) {
      fix(first);
      return;
    }
    const data = draftToWrite(draft);
    try {
      let id = props.recipeId;
      if (id) {
        await update.mutateAsync({ id, data });
      } else {
        const created = await create.mutateAsync({ data });
        if (created.status !== 201) return;
        id = String(created.data.id);
      }
      clearDraft(props.recipeId);
      await queryClient.invalidateQueries({ queryKey: getListRecipesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetRecipeQueryKey(id) });
      await navigate({ to: "/recipes/$id", params: { id } });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unknown error");
    }
  };

  const discardRestored = () => {
    clearDraft(props.recipeId);
    setDraft(reconcile(structuredClone(props.initial)));
    setShowRestored(false);
    // Markdown editors take their text once; remount them on the restored draft.
    setGeneration((value) => value + 1);
  };

  return (
    <div class="flex flex-col gap-4 pb-8">
      <div class="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <h1 class="mr-auto text-lg font-bold">{props.recipeId ? "Edit recipe" : "New recipe"}</h1>
        <ToggleGroup
          variant="outline"
          size="sm"
          value={props.pane}
          aria-label="Right side"
          onChange={(value) => {
            if (value === "step" || value === "flow") {
              props.onPane(value);
              setSide("editor");
            }
          }}
        >
          <ToggleGroupItem value="step" class="gap-1">
            <IconLayoutList aria-hidden="true" />
            Step
          </ToggleGroupItem>
          <ToggleGroupItem value="flow" class="gap-1">
            <IconSitemap aria-hidden="true" />
            Flow
          </ToggleGroupItem>
        </ToggleGroup>
        <Show when={props.recipeId}>{(id) => <ShareSheet recipeId={id()} />}</Show>
        <Button type="button" size="lg" disabled={pending()} onClick={() => void save()}>
          <IconDeviceFloppy aria-hidden="true" />
          {pending() ? "Saving…" : "Save"}
        </Button>
      </div>

      <Show when={showRestored()}>
        <Alert>
          <AlertTitle>Unsaved changes restored</AlertTitle>
          <AlertDescription>From your last visit on this device.</AlertDescription>
          <AlertAction>
            <Button type="button" size="sm" variant="outline" onClick={discardRestored}>
              Discard
            </Button>
          </AlertAction>
        </Alert>
      </Show>
      <Show when={saveError()}>
        <Alert variant="destructive">
          <AlertTitle>Could not save</AlertTitle>
          <AlertDescription>{saveError()}</AlertDescription>
        </Alert>
      </Show>

      <Show when={generation() + 1} keyed>
        {(mount) => (
          <div
            data-mount={mount}
            class="grid gap-6 lg:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] lg:items-start"
          >
            <aside
              aria-label="Recipe summary"
              class={cn(
                "flex-col lg:sticky lg:top-16 lg:flex lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto lg:pr-2",
                side() === "summary" ? "flex" : "hidden"
              )}
            >
              <SummaryPanel
                draft={draft}
                setDraft={setDraft}
                actions={actions}
                catalog={catalog}
                summary={summary()}
                warnings={warnings()}
                numbers={numbers()}
                selected={props.pane === "step" ? selection() : undefined}
                onSelect={select}
                onFix={fix}
              />
            </aside>

            <section
              aria-label="Editor"
              class={cn(
                "min-w-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground lg:flex",
                side() === "editor" ? "flex" : "hidden"
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="w-fit lg:hidden"
                onClick={() => setSide("summary")}
              >
                <IconChevronLeft aria-hidden="true" />
                Summary
              </Button>
              <Switch>
                <Match when={props.pane === "flow"}>
                  <FlowPane draft={draft} actions={actions} issues={issues()} onOpen={select} />
                </Match>
                <Match when={selection() === "details"}>
                  <DetailsEditor draft={draft} setDraft={setDraft} />
                </Match>
                <Match when={selection()}>
                  {(key) => (
                    <Show when={key()} keyed>
                      {(stepKey) => (
                        <StepEditor
                          stepKey={stepKey}
                          number={numbers().get(stepKey) ?? 0}
                          draft={draft}
                          actions={actions}
                          catalog={catalog}
                          onSelect={select}
                        />
                      )}
                    </Show>
                  )}
                </Match>
                <Match when={draft.nodes.length === 0}>
                  <Empty class="border border-dashed py-12">
                    <EmptyHeader>
                      <EmptyTitle>No steps yet</EmptyTitle>
                      <EmptyDescription>
                        A recipe is its steps. Each step lists what it uses; the summary adds them
                        up.
                      </EmptyDescription>
                    </EmptyHeader>
                    <Button
                      type="button"
                      onClick={() => {
                        const key = actions.addStep("next");
                        if (key) select(key);
                      }}
                    >
                      <IconPlus aria-hidden="true" />
                      Add the first step
                    </Button>
                  </Empty>
                </Match>
              </Switch>
            </section>
          </div>
        )}
      </Show>
    </div>
  );
}
