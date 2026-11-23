import { useRecipeView } from "@/components/recipe/view/context";
import { CookMode } from "@/components/recipe/view/cook-mode";
import { StepComments } from "@/components/recipe/view/step-comments";
import { createFileRoute } from "@tanstack/solid-router";

/**
 * Cook mode on one step. Moving between steps only changes the param, so this component stays
 * mounted and timers and done marks carry over.
 */
export const Route = createFileRoute("/recipes/$id/_view/$step")({
  component: CookStepPage,
});

function CookStepPage() {
  const params = Route.useParams();
  const navigate = Route.useNavigate();
  const view = useRecipeView();
  return (
    <CookMode
      draft={view.draft()}
      cooks={view.cooks()}
      catalog={view.catalog}
      stepKey={params().step}
      onStep={(step, replace) =>
        // CookMode scrolls the page to its stage itself; the router's reset to the top would
        // undo that.
        void navigate({
          to: "/recipes/$id/$step",
          params: { id: params().id, step },
          replace,
          resetScroll: false,
        })
      }
      comments={(stepKey) => (
        <StepComments
          recipeId={view.recipeId()}
          stepKey={stepKey}
          comments={view.detail().comments ?? []}
          userId={view.userId()}
          ownerId={view.detail().ownerId}
        />
      )}
    />
  );
}
