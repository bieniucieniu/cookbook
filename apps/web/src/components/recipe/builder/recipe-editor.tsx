import {
  IconChevronLeft,
  IconDeviceFloppy,
  IconLayoutList,
  IconPlus,
  IconPencil,
} from "@/components/icons";
import { Button } from "@/components/m3/button";
import { ScrollArea } from "@/components/m3/scroll-area";
import { snackbar } from "@/components/m3/snackbar";
import { Toolbar } from "@/components/m3/toolbar";
import { EmptyState } from "@/components/page-state";
import { Recipes } from "@/generated/recipes/recipes";
import { useCatalog } from "@/lib/catalog";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { draftToWrite, type RecipeDraft } from "@/lib/recipe-draft";
import { createSubmit } from "@/lib/submit";
import { stepNumbers, validateGraph } from "@/lib/recipe-graph";
import { summarize } from "@/lib/recipe-summary";
import { cn } from "@/lib/utils";
import { useNavigate } from "@solidjs/router";
import {
  createEffect,
  createMemo,
  createSignal,
  createStore,
  Match,
  onSettled,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { createDraftActions } from "./actions";
import { DetailsEditor } from "./details-editor";
import { ShareSheet } from "./share-sheet";
import { StepEditor } from "./step-editor";
import { SummaryPanel } from "./summary-panel";
import { draftWarnings, type Warning } from "./warnings";
import { paths } from "@/paths";

/**
 * Split view: the whole recipe on the left, one step (or the recipe details) on the right. On a
 * phone the two sides take turns. The draft autosaves to localStorage, so the editor renders on
 * the client only (see the edit and new routes).
 */
export default function RecipeEditor(props: {
  initial: RecipeDraft;
  recipeId?: string;
  /** A step key, `details`, or nothing (first step). */
  selected?: string;
  onSelect: (selection: string | undefined) => void;
}) {
  const navigate = useNavigate();
  const catalog = useCatalog();
  // Snapshots of the props this editor opened with: `initial` is the loaded recipe.
  const initial = untrack(() => props.initial);
  const recipeId = untrack(() => props.recipeId);
  // The loaded recipe, serialized. A stored draft only counts when it differs from this.
  const baseline = JSON.stringify(initial);
  const stored = loadDraft(recipeId);
  const restored = stored && JSON.stringify(stored) !== baseline ? stored : undefined;
  const [draft, setDraft] = createStore<RecipeDraft>(structuredClone(restored ?? initial));
  const [generation, setGeneration] = createSignal(0);
  /** Phones only: which side is showing. */
  const [side, setSide] = createSignal<"summary" | "editor">("summary");
  const actions = createDraftActions(draft, setDraft);
  const [pending, submit] = createSubmit();

  // Autosave real edits only. A draft equal to the loaded recipe (just opened, or every change
  // undone, or discarded) clears storage, so the next visit loads the server copy.
  createEffect(
    () => JSON.stringify(draft),
    (json) => {
      if (json === baseline) clearDraft(recipeId);
      else saveDraft(recipeId, json);
    }
  );

  const issues = createMemo(() => validateGraph(draft.nodes, draft.edges));
  const summary = createMemo(() => summarize(draft));
  const warnings = createMemo(() => draftWarnings(draft, issues(), summary(), catalog));
  const blocking = () => warnings().filter((warning) => warning.blocking);
  const numbers = createMemo(() => stepNumbers(draft.nodes, draft.edges));

  /** The step shown on the right: the one asked for, else the first. */
  const selection = createMemo(() => {
    const wanted = props.selected;
    if (wanted === "details") return "details";
    if (wanted && draft.nodes.some((node) => node.key === wanted)) return wanted;
    return draft.nodes[0]?.key;
  });

  const select = (next: string | undefined) => {
    props.onSelect(next);
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
    const id = await submit(
      "save",
      async () => {
        if (recipeId === undefined) return String((await Recipes.createRecipe(data)).id);
        await Recipes.updateRecipe(recipeId, data);
        return recipeId;
      },
      { persistent: true }
    );
    if (id === undefined) return;
    clearDraft(recipeId);
    navigate(paths.recipes(id));
  };

  const discardRestored = () => {
    clearDraft(recipeId);
    setDraft(() => structuredClone(initial));
    // Markdown editors take their text once; remount them on the restored draft.
    setGeneration((value) => value + 1);
  };

  // A restored draft is announced once, with Discard as the snackbar action.
  // It goes away with the editor.
  onSettled(() => {
    if (restored === undefined) return;
    const id = snackbar("Unsaved changes from your last visit restored.", {
      duration: Infinity,
      action: { label: "Discard", onAction: discardRestored },
    });
    return () => snackbar.dismiss(id);
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
                  actions={actions}
                  catalog={catalog}
                  summary={summary()}
                  warnings={warnings()}
                  numbers={numbers()}
                  selected={selection()}
                  onSelect={select}
                  onFix={fix}
                />
              </ScrollArea>
            </aside>

            <section
              aria-label="Editor"
              class={cn(
                "min-w-0 flex-col gap-4 text-on-surface expanded:flex expanded:border-l expanded:border-outline-variant expanded:pl-6",
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
                <Match when={selection() === "details"}>
                  <DetailsEditor draft={draft} actions={actions} />
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
