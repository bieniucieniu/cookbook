import { PageErrored, PageLoading } from "@/components/page-state";
import { preloadEditor, RecipeEditor } from "@/components/recipe/builder/client";
import { Recipes } from "@/generated/recipes/recipes";
import { useEditorStep } from "@/lib/editor-search";
import { detailToDraft } from "@/lib/recipe-draft";
import { type RouteDefinition, useParams } from "@solidjs/router";
import { createMemo, Show } from "solid-js";

export const route = {
  preload: ({ params }) => {
    void Recipes.getRecipe(params.id ?? "");
    preloadEditor();
  },
} satisfies RouteDefinition;

export default function EditRecipePage() {
  const params = useParams();
  return (
    <main class="flex w-full flex-col gap-2 px-4 medium:px-6">
      <PageErrored title="Could not load the recipe" notFoundTitle="Recipe not found">
        <Editor id={params.id ?? ""} />
      </PageErrored>
    </main>
  );
}

function Editor(props: { id: string }) {
  const [step, selectStep] = useEditorStep();
  const draft = createMemo(async () => detailToDraft(await Recipes.getRecipe(props.id)));
  // Not keyed: the editor takes the draft once, as its starting point, and stays mounted when the
  // recipe revalidates (every write does).
  return (
    <Show when={draft()}>
      {(initial) => (
        <RecipeEditor
          initial={initial()}
          recipeId={props.id}
          selected={step()}
          onSelect={selectStep}
          fallback={<PageLoading label="Loading the editor" />}
        />
      )}
    </Show>
  );
}
