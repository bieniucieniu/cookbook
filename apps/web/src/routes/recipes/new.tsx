import { RecipeEditor } from "@/components/recipe/builder/recipe-editor";
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
    <main class="flex w-full flex-col gap-2 px-4 medium:px-6">
      <RecipeEditor
        initial={blankDraft()}
        selected={search().step}
        onSelect={(step) => void navigate({ search: (prev) => ({ ...prev, step }), replace: true })}
      />
    </main>
  );
}

function editorSearch(search: Record<string, unknown>): { step?: string } {
  return typeof search.step === "string" && search.step ? { step: search.step } : {};
}
