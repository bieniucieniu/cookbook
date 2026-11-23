import { PageLoading } from "@/components/page-state";
import { preloadEditor, RecipeEditor } from "@/components/recipe/builder/client";
import { useEditorStep } from "@/lib/editor-search";
import { blankDraft } from "@/lib/recipe-draft";
import type { RouteDefinition } from "@solidjs/router";

export const route = { preload: preloadEditor } satisfies RouteDefinition;

export default function NewRecipePage() {
  const [step, selectStep] = useEditorStep();
  return (
    <main class="flex w-full flex-col gap-2 px-4 medium:px-6">
      <RecipeEditor
        initial={blankDraft()}
        selected={step()}
        onSelect={selectStep}
        fallback={<PageLoading label="Loading the editor" />}
      />
    </main>
  );
}
