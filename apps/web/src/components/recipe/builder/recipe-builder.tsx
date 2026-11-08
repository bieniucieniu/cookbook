import { IconChevronLeft, IconChevronRight, IconDeviceFloppy } from "@/components/icons";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  getGetRecipeQueryKey,
  getListRecipesQueryKey,
  useCreateRecipe,
  useUpdateRecipe,
} from "@/generated/recipes/recipes";
import { useCatalog } from "@/lib/catalog";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft-storage";
import { draftToWrite, type RecipeDraft } from "@/lib/recipe-draft";
import { validateGraph } from "@/lib/recipe-graph";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/solid-query";
import { useNavigate } from "@tanstack/solid-router";
import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { Dynamic } from "solid-js/web";
import { createDraftActions } from "./actions";
import { BasicsStage } from "./basics-stage";
import { FlowStage } from "./flow-stage";
import { ItemsStage } from "./items-stage";
import { ReviewStage } from "./review-stage";
import { ShareSheet } from "./share-sheet";
import { draftWarnings, stages, type StageId } from "./stages";
import { StepsStage } from "./steps-stage";

/**
 * Builds a recipe in five stages, like a phone setup flow. Any stage can be opened from the
 * dots. Next only checks the current stage. The draft autosaves to this browser.
 */
export function RecipeBuilder(props: {
  initial: RecipeDraft;
  recipeId?: string;
  stage: StageId;
  onStage: (stage: StageId) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const restored = loadDraft(props.recipeId);
  const [draft, setDraft] = createStore<RecipeDraft>(structuredClone(restored ?? props.initial));
  const [showRestored, setShowRestored] = createSignal(restored !== undefined);
  const [saveError, setSaveError] = createSignal<string>();
  const [attempted, setAttempted] = createSignal(false);
  const actions = createDraftActions(draft, setDraft);
  const create = useCreateRecipe();
  const update = useUpdateRecipe();

  createEffect(() => {
    const snapshot = JSON.stringify(draft);
    saveDraft(props.recipeId, JSON.parse(snapshot));
  });

  const issues = createMemo(() => validateGraph(draft.nodes, draft.edges));
  const warnings = createMemo(() => draftWarnings(draft, issues(), catalog));
  const blocking = () => warnings().filter((warning) => warning.blocking);
  const stageIndex = () => stages.findIndex((stage) => stage.id === props.stage);
  const stageBlocked = (stage: StageId) => blocking().some((warning) => warning.stage === stage);
  const pending = () => create.isPending || update.isPending;

  const go = (stage: StageId, nodeKey?: string) => {
    props.onStage(stage);
    if (nodeKey) {
      setTimeout(
        () =>
          document
            .getElementById(`step-${nodeKey}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        120
      );
    } else {
      window.scrollTo({ top: 0 });
    }
  };

  const next = () => {
    setAttempted(true);
    if (props.stage === "basics" && !draft.title.trim()) return;
    const following = stages[stageIndex() + 1];
    if (following) {
      setAttempted(false);
      go(following.id);
    }
  };

  const save = async () => {
    setSaveError(undefined);
    const first = blocking()[0];
    if (first) {
      go(first.stage, first.nodeKey);
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
  };

  return (
    <div class="flex flex-col gap-4 pb-28">
      <nav
        aria-label="Stages"
        class="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur"
      >
        <ol class="flex items-center justify-between gap-1">
          <For each={stages}>
            {(stage, index) => (
              <li class="flex flex-1 items-center">
                <button
                  type="button"
                  class={cn(
                    "flex w-full flex-col items-center gap-1 rounded-md px-1 py-1.5 text-xs font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
                    stage.id === props.stage ? "text-foreground" : "text-muted-foreground"
                  )}
                  aria-current={stage.id === props.stage ? "step" : undefined}
                  onClick={() => go(stage.id)}
                >
                  <span
                    class={cn(
                      "relative flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                      stage.id === props.stage
                        ? "border-primary bg-primary text-primary-foreground"
                        : index() < stageIndex()
                          ? "border-primary text-foreground"
                          : "border-border"
                    )}
                  >
                    <Dynamic component={stage.icon} size={18} stroke={1.75} aria-hidden="true" />
                    <Show when={stageBlocked(stage.id) && (attempted() || index() < stageIndex())}>
                      <span
                        class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-destructive"
                        aria-label="Needs a fix"
                      />
                    </Show>
                  </span>
                  <span>{stage.label}</span>
                </button>
              </li>
            )}
          </For>
        </ol>
      </nav>

      <div class="flex items-center justify-between gap-2">
        <h1 class="text-lg font-bold">{stages[stageIndex()]?.label}</h1>
        <Show when={props.recipeId}>{(id) => <ShareSheet recipeId={id()} />}</Show>
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

      <Switch>
        <Match when={props.stage === "basics"}>
          <BasicsStage draft={draft} setDraft={setDraft} />
          <Show when={attempted() && !draft.title.trim()}>
            <p class="text-sm text-destructive" role="alert">
              Add a name to continue.
            </p>
          </Show>
        </Match>
        <Match when={props.stage === "items"}>
          <ItemsStage draft={draft} actions={actions} catalog={catalog} />
        </Match>
        <Match when={props.stage === "steps"}>
          <StepsStage draft={draft} actions={actions} catalog={catalog} />
        </Match>
        <Match when={props.stage === "flow"}>
          <FlowStage draft={draft} actions={actions} issues={issues()} />
        </Match>
        <Match when={props.stage === "review"}>
          <ReviewStage
            draft={draft}
            catalog={catalog}
            warnings={warnings()}
            error={saveError()}
            onFix={go}
          />
        </Match>
      </Switch>

      <footer class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div class="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            class="h-11 px-4 text-sm"
            disabled={stageIndex() === 0}
            onClick={() => {
              const previous = stages[stageIndex() - 1];
              if (previous) go(previous.id);
            }}
          >
            <IconChevronLeft aria-hidden="true" />
            Back
          </Button>
          <span class="text-xs text-muted-foreground tabular-nums" aria-live="polite">
            {stageIndex() + 1} / {stages.length}
          </span>
          <Show
            when={props.stage === "review"}
            fallback={
              <Button type="button" size="lg" class="h-11 px-4 text-sm" onClick={next}>
                Next
                <IconChevronRight aria-hidden="true" />
              </Button>
            }
          >
            <Button
              type="button"
              size="lg"
              class="h-11 px-4 text-sm"
              disabled={pending()}
              onClick={() => void save()}
            >
              <IconDeviceFloppy aria-hidden="true" />
              {pending() ? "Saving…" : "Save"}
            </Button>
          </Show>
        </div>
      </footer>
    </div>
  );
}
