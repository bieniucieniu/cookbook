import { RecipeGraph } from "@/components/recipe-graph";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useCurrentUser } from "@/generated/auth/auth";
import type { RecipeDetail } from "@/generated/model";
import {
  getListIngredientsQueryOptions,
  type listIngredientsResponse,
} from "@/generated/ingredients/ingredients";
import {
  getGetRecipeQueryKey,
  getGetRecipeQueryOptions,
  getListRecipesQueryKey,
  useCreateRecipeComment,
  useDeleteRecipe,
  useDeleteRecipeComment,
  type getRecipeResponse,
} from "@/generated/recipes/recipes";
import { signedIn } from "@/lib/session";
import { ApiError } from "@/mutator";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/solid-router";
import { createMemo, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";

export const Route = createFileRoute("/recipes/$id/")({
  component: RecipePage,
});

function RecipePage() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useCurrentUser();
  const recipe = useQuery(() => getGetRecipeQueryOptions(params().id));
  const ingredients = useQuery(() => getListIngredientsQueryOptions());
  const remove = useDeleteRecipe();
  const [mode, setMode] = createSignal<"columns" | "graph">("columns");
  const detail = () => recipeDetail(recipe.data);
  const names = createMemo(() => ingredientNames(ingredients.data));
  const user = () => signedIn(session.data);

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
    <main class="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4">
      <Link to="/" class="text-xs text-muted-foreground">
        Recipes
      </Link>
      <Show when={recipe.isPending}>
        <Spinner />
      </Show>
      <Show when={recipe.isError}>
        <Alert>
          <Alert.Title>
            {recipe.error instanceof ApiError && recipe.error.status === 404
              ? "Recipe not found"
              : "Could not load the recipe"}
          </Alert.Title>
          <Alert.Description>{recipe.error?.message}</Alert.Description>
        </Alert>
      </Show>
      <Show when={remove.error}>
        <Alert>
          <Alert.Title>Could not delete the recipe</Alert.Title>
          <Alert.Description>{remove.error?.message}</Alert.Description>
        </Alert>
      </Show>
      <Show when={detail()}>
        {(item) => (
          <>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 class="text-sm font-medium">{item().title}</h1>
                <p class="text-xs text-muted-foreground">
                  {item().visibility} · {item().cooks} cooks
                </p>
              </div>
              <div class="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setMode(mode() === "columns" ? "graph" : "columns")}
                >
                  {mode() === "columns" ? "Graph" : "Columns"}
                </Button>
                <Show when={user()}>
                  <Button
                    type="button"
                    onClick={() =>
                      void navigate({ to: "/recipes/$id/edit", params: { id: params().id } })
                    }
                  >
                    Edit
                  </Button>
                  <Button type="button" disabled={remove.isPending} onClick={() => void onDelete()}>
                    Delete
                  </Button>
                </Show>
              </div>
            </div>
            <Show
              when={mode() === "graph"}
              fallback={<RecipeColumns recipe={item()} names={names()} userId={user()?.id} />}
            >
              {(_visible) => <RecipeGraph recipe={item()} />}
            </Show>
          </>
        )}
      </Show>
    </main>
  );
}

function RecipeColumns(props: {
  recipe: RecipeDetail;
  names: Map<number, string>;
  userId: number | undefined;
}) {
  const params = Route.useParams();
  const queryClient = useQueryClient();
  const post = useCreateRecipeComment();
  const remove = useDeleteRecipeComment();
  const [bodies, setBodies] = createStore<Record<string, string>>({});
  const steps = () => [...props.recipe.nodes].sort((left, right) => left.ord - right.ord);
  const lines = () => rollup(props.recipe, props.names);

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetRecipeQueryKey(params().id) });

  return (
    <div class="grid gap-4 lg:grid-cols-3">
      <section class="flex flex-col gap-2">
        <h2 class="text-sm font-medium">Ingredients</h2>
        <Show
          when={lines().length > 0}
          fallback={<p class="text-xs text-muted-foreground">No ingredients.</p>}
        >
          <ul class="flex flex-col gap-1">
            <For each={lines()}>
              {(line) => (
                <li class="text-xs">
                  {line.qty == null ? "" : `${formatQty(line.qty)} `}
                  {line.unit ? `${line.unit} ` : ""}
                  {line.name}
                  <Show when={line.optional}>
                    <span class="text-muted-foreground"> optional</span>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium">Method</h2>
        <Show when={props.recipe.description}>
          <p class="text-xs">{props.recipe.description}</p>
        </Show>
        <For each={props.recipe.photos ?? []}>
          {(photo) => (
            <img
              src={`/api/photos/${photo.id}`}
              alt={photo.alt ?? ""}
              class="max-h-64 w-fit rounded-md"
            />
          )}
        </For>
        <For each={steps()}>
          {(node) => (
            <article class="flex flex-col gap-1">
              <h3 class="text-xs font-medium">{node.title}</h3>
              <Show when={node.body}>
                <p class="text-xs text-muted-foreground">{node.body}</p>
              </Show>
            </article>
          )}
        </For>
      </section>
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium">Notes</h2>
        <Show when={props.recipe.notes}>
          <p class="text-xs">{props.recipe.notes}</p>
        </Show>
        <For each={steps()}>
          {(node) => (
            <article class="flex flex-col gap-2">
              <h3 class="text-xs font-medium">{node.title}</h3>
              <For
                each={(props.recipe.comments ?? []).filter(
                  (comment) => comment.stepKey === node.key
                )}
              >
                {(comment) => (
                  <div class="flex flex-col gap-1">
                    <p class="text-xs text-muted-foreground">
                      {comment.email} · {formatTime(comment.createdAt)}
                    </p>
                    <p class="text-xs">{comment.body}</p>
                    <Show
                      when={
                        props.userId != null &&
                        (comment.userId === props.userId || props.recipe.ownerId === props.userId)
                      }
                    >
                      <Button
                        type="button"
                        disabled={remove.isPending}
                        onClick={() => {
                          void remove
                            .mutateAsync({
                              id: params().id,
                              commentId: String(comment.id),
                            })
                            .then(() => refresh())
                            .catch(() => undefined);
                        }}
                      >
                        Delete
                      </Button>
                    </Show>
                  </div>
                )}
              </For>
              <Show when={props.userId != null}>
                <form
                  class="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const body = (bodies[node.key] ?? "").trim();
                    if (!body) return;
                    void post
                      .mutateAsync({
                        id: params().id,
                        data: { stepKey: node.key, body },
                      })
                      .then(() => {
                        setBodies(node.key, "");
                        return refresh();
                      })
                      .catch(() => undefined);
                  }}
                >
                  <Input
                    value={bodies[node.key] ?? ""}
                    onChange={(value) => setBodies(node.key, value)}
                  >
                    <Input.Label>Comment</Input.Label>
                    <Input.Input />
                  </Input>
                  <Button type="submit" disabled={post.isPending}>
                    Post
                  </Button>
                </form>
              </Show>
            </article>
          )}
        </For>
        <Show when={post.error}>
          <Alert>
            <Alert.Title>Could not post the comment</Alert.Title>
            <Alert.Description>{post.error?.message}</Alert.Description>
          </Alert>
        </Show>
      </section>
    </div>
  );
}

type RolledLine = {
  name: string;
  qty: number | null;
  unit: string | null;
  optional: boolean;
};

function rollup(recipe: RecipeDetail, names: Map<number, string>): RolledLine[] {
  const groups = new Map<
    string,
    {
      name: string;
      unit: string | null;
      qty: number;
      qtyCount: number;
      total: number;
      optional: number;
    }
  >();
  const order: string[] = [];
  for (const node of [...recipe.nodes].sort((left, right) => left.ord - right.ord)) {
    for (const use of node.ingredients) {
      const unit = use.unit ?? null;
      const key = `${use.ingredientId}\0${unit ?? ""}`;
      let row = groups.get(key);
      if (!row) {
        row = {
          name: names.get(use.ingredientId) ?? use.slug,
          unit,
          qty: 0,
          qtyCount: 0,
          total: 0,
          optional: 0,
        };
        groups.set(key, row);
        order.push(key);
      }
      row.total += 1;
      if (use.optional) row.optional += 1;
      if (use.qty != null) {
        row.qty += use.qty;
        row.qtyCount += 1;
      }
    }
  }
  return order.map((key) => {
    const row = groups.get(key);
    if (!row) return { name: key, qty: null, unit: null, optional: false };
    return {
      name: row.name,
      unit: row.unit,
      qty: row.qtyCount > 0 ? row.qty : null,
      optional: row.optional === row.total,
    };
  });
}

function formatQty(qty: number): string {
  if (Number.isInteger(qty)) return String(qty);
  return String(Math.round(qty * 1000) / 1000);
}

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

function recipeDetail(result: getRecipeResponse | undefined): RecipeDetail | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}

function ingredientNames(result: listIngredientsResponse | undefined): Map<number, string> {
  const names = new Map<number, string>();
  if (!result || result.status !== 200) return names;
  for (const item of result.data) {
    if (item.id != null) names.set(item.id, item.name);
  }
  return names;
}
