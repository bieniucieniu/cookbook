import { RecipeEditor, type EditorPane } from "@/components/recipe/builder/recipe-editor";
import { blankDraft } from "@/lib/recipe-draft";
import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/recipes/new")({
  validateSearch: editorSearch,
  component: NewRecipePage,
});

function NewRecipePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <main class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 pt-2">
      <RecipeEditor
        initial={blankDraft()}
        selected={search().step}
        pane={search().pane ?? "step"}
        onSelect={(step) => void navigate({ search: (prev) => ({ ...prev, step }), replace: true })}
        onPane={(pane) => void navigate({ search: (prev) => ({ ...prev, pane }), replace: true })}
      />
    </main>
  );
}

function editorSearch(search: Record<string, unknown>): { step?: string; pane?: EditorPane } {
  return {
    ...(typeof search.step === "string" && search.step ? { step: search.step } : {}),
    ...(search.pane === "flow" || search.pane === "step" ? { pane: search.pane } : {}),
  };
}
