import {
  IconChevronLeft,
  IconDeviceFloppy,
  IconLayoutList,
  IconPlus,
  IconPencil,
  IconSitemap,
} from "@/components/icons";
import { Button, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import { ScrollArea } from "@/components/m3/scroll-area";
import {
  Snackbar,
  SnackbarAction,
  SnackbarClose,
  SnackbarMessage,
  snackbar,
} from "@/components/m3/snackbar";
import { Toolbar } from "@/components/m3/toolbar";
import { notifyError } from "@/components/notify";
import { EmptyState } from "@/components/page-state";
import {
  getGetRecipeQueryKey,
  getListRecipesQueryKey,
  useCreateRecipe,
  useUpdateRecipe,
} from "@/generated/recipes/recipes";
import { useCatalog } from "@/lib/catalog";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { draftToWrite, type RecipeDraft } from "@/lib/recipe-draft";
import { stepNumbers, validateGraph } from "@/lib/recipe-graph";
import { summarize } from "@/lib/recipe-summary";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/solid-query";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, Match, onMount, Show, Switch } from "solid-js";
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
  // The loaded recipe, serialized. A stored draft only counts when it differs from this.
  const baseline = JSON.stringify(props.initial);
  const stored = loadDraft(props.recipeId);
  const restored = stored && JSON.stringify(stored) !== baseline ? stored : undefined;
  const [draft, setDraft] = createStore<RecipeDraft>(structuredClone(restored ?? props.initial));
  const [generation, setGeneration] = createSignal(0);
  /** Phones only: which side is showing. */
  const [side, setSide] = createSignal<"summary" | "editor">("summary");
  const actions = createDraftActions(draft, setDraft);
  const create = useCreateRecipe();
  const update = useUpdateRecipe();

  // Autosave real edits only. A draft equal to the loaded recipe (just opened, or every change
  // undone, or discarded) clears storage, so the next visit loads the server copy.
  createEffect(() => {
    if (JSON.stringify(draft) === baseline) clearDraft(props.recipeId);
    else saveDraft(props.recipeId, draft);
  });

  const issues = createMemo(() => validateGraph(draft.nodes, draft.edges));
  const summary = createMemo(() => summarize(draft));
  const warnings = createMemo(() => draftWarnings(draft, issues(), summary(), catalog));
  const blocking = () => warnings().filter((warning) => warning.blocking);
  const numbers = createMemo(() => stepNumbers(draft.nodes, draft.edges));
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
      notifyError("save", error, { persistent: true });
    }
  };

  const discardRestored = () => {
    clearDraft(props.recipeId);
    setDraft(reconcile(structuredClone(props.initial)));
    // Markdown editors take their text once; remount them on the restored draft.
    setGeneration((value) => value + 1);
  };

  // A restored draft is announced once, with Discard as the snackbar action.
  onMount(() => {
    if (restored === undefined) return;
    snackbar.show((toast) => (
      <Snackbar toastId={toast.toastId} persistent>
        <SnackbarMessage>Unsaved changes from your last visit restored.</SnackbarMessage>
        <SnackbarAction
          onClick={() => {
            discardRestored();
            snackbar.dismiss(toast.toastId);
          }}
        >
          Discard
        </SnackbarAction>
        <SnackbarClose />
      </Snackbar>
    ));
  });

  return (
    <div class="flex flex-col gap-4 pb-8">
      {/* Vibrant docked toolbar: the color marks edit mode; Save is the one filled action. */}
      <Toolbar
        color="vibrant"
        class="sticky top-(--app-bar-height) z-20 -mx-4 h-auto min-h-16 w-auto flex-wrap gap-y-2 py-2 medium:-mx-6 medium:px-6"
      >
        <h1 class="mr-auto flex items-center gap-2 typescale-title-large">
          <IconPencil class="size-6" aria-hidden="true" />
          {props.recipeId ? "Edit recipe" : "New recipe"}
        </h1>
        <ButtonGroup variant="connected" size="sm" aria-label="Right side">
          <ToggleButton
            variant="tonal"
            pressed={props.pane === "step"}
            onChange={() => {
              props.onPane("step");
              setSide("editor");
            }}
          >
            <IconLayoutList aria-hidden="true" />
            Step
          </ToggleButton>
          <ToggleButton
            variant="tonal"
            pressed={props.pane === "flow"}
            onChange={() => {
              props.onPane("flow");
              setSide("editor");
            }}
          >
            <IconSitemap aria-hidden="true" />
            Flow
          </ToggleButton>
        </ButtonGroup>
        <Show when={props.recipeId}>{(id) => <ShareSheet recipeId={id()} />}</Show>
        <Button size="sm" disabled={pending()} onClick={() => void save()}>
          <IconDeviceFloppy aria-hidden="true" />
          {pending() ? "Saving…" : "Save"}
        </Button>
      </Toolbar>

      <Show when={generation() + 1} keyed>
        {(mount) => (
          <div
            data-mount={mount}
            class="grid gap-6 expanded:grid-cols-[minmax(20rem,28rem)_minmax(0,1fr)] expanded:items-start"
          >
            <aside
              aria-label="Recipe summary"
              class={cn(
                "flex-col expanded:sticky expanded:top-[calc(var(--app-bar-height)+5rem)] expanded:flex",
                side() === "summary" ? "flex" : "hidden"
              )}
            >
              <ScrollArea class="expanded:max-h-[calc(100dvh-var(--app-bar-height)-6rem)] expanded:pr-2">
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
              </ScrollArea>
            </aside>

            <section
              aria-label="Editor"
              class={cn(
                "min-w-0 flex-col gap-4 rounded-extra-large bg-surface-container-low p-4 text-on-surface [--text-field-notch:var(--md-sys-color-surface-container-low)] medium:p-6 expanded:flex",
                side() === "editor" ? "flex" : "hidden"
              )}
            >
              <Button
                variant="text"
                size="sm"
                class="w-fit expanded:hidden"
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
                  <EmptyState
                    icon={IconLayoutList}
                    title="No steps yet"
                    description="A recipe is its steps. Each step lists what it uses; the summary adds them up."
                  >
                    <Button
                      onClick={() => {
                        const key = actions.addStep("next");
                        if (key) select(key);
                      }}
                    >
                      <IconPlus aria-hidden="true" />
                      Add the first step
                    </Button>
                  </EmptyState>
                </Match>
              </Switch>
            </section>
          </div>
        )}
      </Show>
    </div>
  );
}
