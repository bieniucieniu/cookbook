import { photoUrl } from "@/lib/api";
import {
  IconChefHat,
  IconClock,
  IconDots,
  IconHandStop,
  IconLayoutList,
  IconLock,
  IconPencil,
  IconSitemap,
  IconTrash,
  IconUsers,
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
import { CookMode } from "@/components/recipe/view/cook-mode";
import { GraphView } from "@/components/recipe/view/graph-view";
import { RecipeList } from "@/components/recipe/view/recipe-list";
import { StepComments } from "@/components/recipe/view/step-comments";
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
import { signedIn } from "@/lib/session";
import { formatSpan } from "@/lib/units";
import { ApiError } from "@/mutator";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";

const views = ["list", "cook", "graph"] as const;
type View = (typeof views)[number];

const viewButtons = [
  { value: "list", label: "List", icon: IconLayoutList },
  { value: "cook", label: "Cook", icon: IconChefHat },
  { value: "graph", label: "Graph", icon: IconSitemap },
] as const;

function isView(value: unknown): value is View {
  return typeof value === "string" && views.some((view) => view === value);
}

export const Route = createFileRoute("/recipes/$id/")({
  validateSearch: (search: Record<string, unknown>): { view?: View } =>
    isView(search.view) ? { view: search.view } : {},
  component: RecipePage,
});

function RecipePage() {
  const params = Route.useParams();
  const search = Route.useSearch();
  const routeNavigate = Route.useNavigate();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useCurrentUser();
  const catalog = useCatalog();
  const recipe = useQuery(() => getGetRecipeQueryOptions(params().id));
  const remove = useDeleteRecipe();
  const detail = () => recipeDetail(recipe.data);
  const user = () => signedIn(session.data);
  const view = () => search().view ?? "list";
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
    <main class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-2 pb-8 medium:px-6">
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
          const footer = (stepKey: string) => (
            <StepComments
              recipeId={params().id}
              stepKey={stepKey}
              comments={item().comments ?? []}
              userId={user()?.id}
              ownerId={item().ownerId}
            />
          );
          return (
            <>
              <Show when={view() !== "cook"}>
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
              </Show>

              <div class="flex flex-wrap items-center justify-between gap-3">
                <ButtonGroup variant="connected" size="sm" aria-label="View">
                  <For each={viewButtons}>
                    {(option) => (
                      <ToggleButton
                        variant="tonal"
                        pressed={view() === option.value}
                        onChange={() => void routeNavigate({ search: { view: option.value } })}
                      >
                        <Dynamic component={option.icon} aria-hidden="true" />
                        {option.label}
                      </ToggleButton>
                    )}
                  </For>
                </ButtonGroup>
                <div class="flex items-center gap-2">
                  <IconLabel
                    icon={IconUsers}
                    label="Cooks"
                    class="typescale-label-large text-on-surface-variant"
                  />
                  <Stepper label="cooks" value={cooks()} onChange={setCooks} max={24} />
                </div>
              </div>

              <Switch>
                <Match when={view() === "list"}>
                  <RecipeList
                    draft={draft()}
                    cooks={cooks()}
                    catalog={catalog}
                    stepFooter={footer}
                  />
                </Match>
                <Match when={view() === "cook"}>
                  <CookMode draft={draft()} cooks={cooks()} catalog={catalog} />
                </Match>
                <Match when={view() === "graph"}>
                  <GraphView draft={draft()} catalog={catalog} stepFooter={footer} />
                </Match>
              </Switch>
            </>
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
