import { useRecipeView } from "@/components/recipe/view/context";
import { CookMode } from "@/components/recipe/view/cook-mode";
import { StepComments } from "@/components/recipe/view/step-comments";
import { useNavigate, useParams } from "@solidjs/router";
import { paths } from "@/paths";

/**
 * Cook mode on one step. Moving between steps only changes the param, so this component stays
 * mounted and timers and done marks carry over.
 */
export default function CookStepPage() {
  const params = useParams();
  const navigate = useNavigate();
  const view = useRecipeView();
  return (
    <CookMode
      draft={view.draft()}
      cooks={view.cooks()}
      catalog={view.catalog}
      stepKey={params.step ?? ""}
      onStep={(step, replace) =>
        // CookMode scrolls the page to its stage itself; the router's scroll to the top would
        // undo that.
        navigate(paths.recipes(view.recipeId())(step), { replace, scroll: false })
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
