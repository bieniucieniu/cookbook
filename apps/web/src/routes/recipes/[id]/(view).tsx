import { photoUrl } from "@/lib/api";
import {
  IconChefHat,
  IconClock,
  IconDots,
  IconHandStop,
  IconLayoutList,
  IconLock,
  IconPencil,
  IconTrash,
} from "@/components/icons";
import { Button, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import {
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeadline,
  DialogIcon,
  DialogOverlay,
  DialogPortal,
} from "@/components/m3/dialog";
import { IconButton } from "@/components/m3/icon-button";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuItemIcon,
  MenuItemLabel,
  MenuPortal,
  MenuTrigger,
} from "@/components/m3/menu";
import { notifyError } from "@/components/notify";
import { ErrorBlock, PageLoading } from "@/components/page-state";
import { MarkdownView } from "@/components/recipe/markdown";
import { IconLabel, Stepper } from "@/components/recipe/parts";
import { RecipeViewContext } from "@/components/recipe/view/context";
import { useCurrentUser } from "@/generated/auth/auth";
import type { RecipeDetail } from "@/generated/model";
import {
  getGetRecipeQueryOptions,
  getListRecipesQueryKey,
  useDeleteRecipe,
  type getRecipeResponse,
} from "@/generated/recipes/recipes";
import { useCatalog } from "@/lib/catalog";
import { detailToDraft } from "@/lib/recipe-draft";
import { lanes } from "@/lib/recipe-graph";
import { settledData } from "@/lib/query";
import { signedIn } from "@/lib/session";
import { formatSpan } from "@/lib/units";
import { ApiError } from "@/mutator";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

const viewButtons = [
  { value: "list", label: "List", icon: IconLayoutList },
  { value: "cook", label: "Cook", icon: IconChefHat },
] as const;

/**
 * Pathless layout for a recipe: the header, the List / Cook switch, and the cook count stay
 * put while the list (`/recipes/$id`) and the cook steps (`/recipes/$id/$step`) swap below.
 */
export const Route = createFileRoute("/recipes/$id/_view")({
  component: RecipeLayout,
});

function RecipeLayout() {
  const params = Route.useParams();
  // The step param belongs to the child route; read it loosely to know which view is open.
  const childParams = useParams({ strict: false });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useCurrentUser();
  const catalog = useCatalog();
  const recipe = useQuery(() => getGetRecipeQueryOptions(params().id));
  const remove = useDeleteRecipe();
  const detail = () => recipeDetail(settledData(recipe));
  const user = () => signedIn(session);
  const view = () => (childParams().step === undefined ? "list" : "cook");
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  const onDelete = async () => {
    try {
      await remove.mutateAsync({ id: params().id });
      await queryClient.invalidateQueries({ queryKey: getListRecipesQueryKey() });
      setConfirmDelete(false);
      await navigate({ to: "/" });
    } catch (error) {
      setConfirmDelete(false);
      notifyError("delete the recipe", error);
    }
  };

  return (
    <main class="flex w-full flex-col gap-6 px-4 pt-2 pb-8 medium:px-6">
      <Show when={recipe.isPending}>
        <PageLoading label="Loading the recipe" />
      </Show>
      <Show when={recipe.isError}>
        <ErrorBlock
          title={
            recipe.error instanceof ApiError && recipe.error.status === 404
              ? "Recipe not found"
              : "Could not load the recipe"
          }
          detail={recipe.error?.message}
        />
      </Show>
      <Show when={detail()}>
        {(item) => {
          const draft = createMemo(() => detailToDraft(item()));
          const [cooks, setCooks] = createSignal(item().cooks);
          const openView = (value: "list" | "cook") => {
            if (value === "list") {
              void navigate({ to: "/recipes/$id", params: { id: params().id } });
              return;
            }
            const first = lanes(draft().nodes, draft().edges)[0]?.[0];
            if (first)
              void navigate({
                to: "/recipes/$id/$step",
                params: { id: params().id, step: first.key },
              });
          };
          return (
            <RecipeViewContext.Provider
              value={{
                recipeId: () => params().id,
                detail: item,
                draft,
                cooks,
                catalog,
                userId: () => user()?.id,
              }}
            >
              {/* Shown in every view, so switching List / Cook keeps the recipe in place. */}
              <header class="flex flex-col gap-5">
                <Show when={item().photos?.[0]}>
                  {(photo) => (
                    <img
                      src={photoUrl(photo().id)}
                      alt={photo().alt ?? ""}
                      class="aspect-[21/9] max-h-80 w-full rounded-extra-large object-cover"
                    />
                  )}
                </Show>
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="flex min-w-0 flex-col gap-2">
                    <h1 class="typescale-emphasized-headline-large text-on-surface">
                      {item().title}
                    </h1>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 typescale-label-large text-on-surface-variant">
                      <IconLabel
                        icon={IconClock}
                        label={formatSpan(item().elapsedMinSeconds, item().elapsedMaxSeconds)}
                      />
                      <IconLabel
                        icon={IconHandStop}
                        label={`${formatSpan(item().handsOnMinSeconds, item().handsOnMaxSeconds)} hands on`}
                      />
                      <Show when={item().visibility === "private"}>
                        <IconLabel icon={IconLock} label="Only you" />
                      </Show>
                    </div>
                  </div>
                  <Show when={user()}>
                    <div class="flex items-center gap-1">
                      <Button
                        onClick={() =>
                          void navigate({
                            to: "/recipes/$id/edit",
                            params: { id: params().id },
                            search: {},
                          })
                        }
                      >
                        <IconPencil aria-hidden="true" />
                        Edit
                      </Button>
                      <Menu placement="bottom-end">
                        <MenuTrigger as={IconButton} aria-label="More actions">
                          <IconDots aria-hidden="true" />
                        </MenuTrigger>
                        <MenuPortal>
                          <MenuContent class="min-w-48">
                            <MenuItem onSelect={() => setConfirmDelete(true)}>
                              <MenuItemIcon>
                                <IconTrash aria-hidden="true" />
                              </MenuItemIcon>
                              <MenuItemLabel>Delete recipe</MenuItemLabel>
                            </MenuItem>
                          </MenuContent>
                        </MenuPortal>
                      </Menu>
                      <Dialog open={confirmDelete()} onOpenChange={setConfirmDelete}>
                        <DialogPortal>
                          <DialogOverlay />
                          <DialogContent>
                            <DialogIcon>
                              <IconTrash aria-hidden="true" />
                            </DialogIcon>
                            <DialogHeadline>Delete “{item().title}”?</DialogHeadline>
                            <DialogDescription>This cannot be undone.</DialogDescription>
                            <DialogActions>
                              <DialogClose>Keep</DialogClose>
                              <Button
                                variant="text"
                                disabled={remove.isPending}
                                onClick={() => void onDelete()}
                              >
                                Delete
                              </Button>
                            </DialogActions>
                          </DialogContent>
                        </DialogPortal>
                      </Dialog>
                    </div>
                  </Show>
                </div>
                <Show when={item().description.trim()}>
                  <MarkdownView value={item().description} />
                </Show>
              </header>

              <div class="flex flex-wrap items-center justify-between gap-3">
                <ButtonGroup variant="connected" size="sm" aria-label="View">
                  <For each={viewButtons}>
                    {(option) => (
                      <ToggleButton
                        variant="tonal"
                        pressed={view() === option.value}
                        onChange={() => openView(option.value)}
                      >
                        <Dynamic component={option.icon} aria-hidden="true" />
                        {option.label}
                      </ToggleButton>
                    )}
                  </For>
                </ButtonGroup>
                <Stepper label="cooks" value={cooks()} onChange={setCooks} max={24} />
              </div>

              <Outlet />
            </RecipeViewContext.Provider>
          );
        }}
      </Show>
    </main>
  );
}

function recipeDetail(result: getRecipeResponse | undefined): RecipeDetail | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
