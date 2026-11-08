import {
  IconChefHat,
  IconClock,
  IconHandStop,
  IconLayoutList,
  IconLock,
  IconPencil,
  IconSitemap,
  IconTrash,
  IconUsers,
} from "@/components/icons";
import { MarkdownView } from "@/components/recipe/markdown";
import { IconLabel, Stepper } from "@/components/recipe/parts";
import { CookMode } from "@/components/recipe/view/cook-mode";
import { GraphView } from "@/components/recipe/view/graph-view";
import { RecipeList } from "@/components/recipe/view/recipe-list";
import { StepComments } from "@/components/recipe/view/step-comments";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCloseButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { formatDuration } from "@/lib/units";
import { ApiError } from "@/mutator";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";

const views = ["list", "cook", "graph"] as const;
type View = (typeof views)[number];

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

  const onDelete = async () => {
    try {
      await remove.mutateAsync({ id: params().id });
      await queryClient.invalidateQueries({ queryKey: getListRecipesQueryKey() });
      await navigate({ to: "/" });
    } catch {
      return;
    }
  };

  return (
    <main class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pt-2 pb-8">
      <Link to="/" class="text-sm text-muted-foreground">
        Recipes
      </Link>
      <Show when={recipe.isPending}>
        <Spinner />
      </Show>
      <Show when={recipe.isError}>
        <Alert variant="destructive">
          <AlertTitle>
            {recipe.error instanceof ApiError && recipe.error.status === 404
              ? "Recipe not found"
              : "Could not load the recipe"}
          </AlertTitle>
          <AlertDescription>{recipe.error?.message}</AlertDescription>
        </Alert>
      </Show>
      <Show when={remove.error}>
        <Alert variant="destructive">
          <AlertTitle>Could not delete the recipe</AlertTitle>
          <AlertDescription>{remove.error?.message}</AlertDescription>
        </Alert>
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
                <header class="flex flex-col gap-4">
                  <Show when={item().photos?.[0]}>
                    {(photo) => (
                      <img
                        src={`/api/photos/${photo().id}`}
                        alt={photo().alt ?? ""}
                        class="aspect-[21/9] max-h-80 w-full rounded-2xl object-cover"
                      />
                    )}
                  </Show>
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex flex-col gap-2">
                      <h1 class="text-2xl font-bold">{item().title}</h1>
                      <div class="flex flex-wrap items-center gap-4 text-sm">
                        <IconLabel
                          icon={IconClock}
                          label={span(item().elapsedMinSeconds, item().elapsedMaxSeconds)}
                        />
                        <IconLabel
                          icon={IconHandStop}
                          label={`${span(item().handsOnMinSeconds, item().handsOnMaxSeconds)} hands on`}
                        />
                        <Show when={item().visibility === "private"}>
                          <IconLabel icon={IconLock} label="Only you" />
                        </Show>
                      </div>
                    </div>
                    <Show when={user()}>
                      <div class="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
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
                        <AlertDialog>
                          <AlertDialogTrigger
                            as={Button}
                            variant="ghost"
                            size="icon-lg"
                            aria-label="Delete recipe"
                          >
                            <IconTrash aria-hidden="true" />
                          </AlertDialogTrigger>
                          <AlertDialogPortal>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete “{item().title}”?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCloseButton>Keep</AlertDialogCloseButton>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  disabled={remove.isPending}
                                  onClick={() => void onDelete()}
                                >
                                  Delete
                                </Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialogPortal>
                        </AlertDialog>
                      </div>
                    </Show>
                  </div>
                  <Show when={item().description.trim()}>
                    <MarkdownView value={item().description} />
                  </Show>
                </header>
              </Show>

              <div class="flex flex-wrap items-center justify-between gap-3">
                <ToggleGroup
                  variant="outline"
                  spacing={0}
                  value={view()}
                  onChange={(value) => {
                    if (isView(value)) void routeNavigate({ search: { view: value } });
                  }}
                  aria-label="View"
                >
                  <ToggleGroupItem value="list" class="h-10 gap-1.5 px-3 text-sm">
                    <IconLayoutList size={18} aria-hidden="true" />
                    List
                  </ToggleGroupItem>
                  <ToggleGroupItem value="cook" class="h-10 gap-1.5 px-3 text-sm">
                    <IconChefHat size={18} aria-hidden="true" />
                    Cook
                  </ToggleGroupItem>
                  <ToggleGroupItem value="graph" class="h-10 gap-1.5 px-3 text-sm">
                    <IconSitemap size={18} aria-hidden="true" />
                    Graph
                  </ToggleGroupItem>
                </ToggleGroup>
                <div class="flex items-center gap-2">
                  <IconLabel icon={IconUsers} label="Cooks" class="text-sm font-medium" />
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

function span(minSeconds: number, maxSeconds: number): string {
  const min = formatDuration(minSeconds);
  const max = formatDuration(maxSeconds);
  return min === max ? min : `${min}–${max}`;
}

function recipeDetail(result: getRecipeResponse | undefined): RecipeDetail | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
