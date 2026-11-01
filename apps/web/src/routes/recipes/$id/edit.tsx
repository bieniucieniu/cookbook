import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { RecipeForm } from "@/components/recipe-form";
import type { RecipeDetail, RecipeGrant } from "@/generated/model";
import {
  getGetRecipeQueryOptions,
  getListRecipeGrantsQueryKey,
  getListRecipeGrantsQueryOptions,
  useDeleteRecipeGrant,
  useUpsertRecipeGrant,
  type getRecipeResponse,
  type listRecipeGrantsResponse,
} from "@/generated/recipes/recipes";
import { detailToDraft } from "@/lib/recipe-draft";
import { ApiError } from "@/mutator";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { Link, createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";

export const Route = createFileRoute("/recipes/$id/edit")({
  component: EditRecipePage,
});

function EditRecipePage() {
  const params = Route.useParams();
  const recipe = useQuery(() => getGetRecipeQueryOptions(params().id));
  const detail = () => recipeDetail(recipe.data);
  return (
    <main class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
      <Link to="/recipes/$id" params={{ id: params().id }} class="text-xs text-muted-foreground">
        Back
      </Link>
      <h1 class="text-sm font-medium">Edit recipe</h1>
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
      <Show when={detail()}>
        {(item) => <RecipeForm initial={detailToDraft(item())} recipeId={params().id} />}
      </Show>
      <Grants recipeId={params().id} />
    </main>
  );
}

function Grants(props: { recipeId: string }) {
  const queryClient = useQueryClient();
  const grants = useQuery(() => ({
    ...getListRecipeGrantsQueryOptions(props.recipeId),
    retry: false,
  }));
  const rows = () => grantRows(grants.data);
  const upsert = useUpsertRecipeGrant();
  const revoke = useDeleteRecipeGrant();
  const [email, setEmail] = createSignal("");
  const [permission, setPermission] = createSignal<"read" | "write">("read");

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getListRecipeGrantsQueryKey(props.recipeId) });

  const onGrant = async (event: SubmitEvent) => {
    event.preventDefault();
    try {
      await upsert.mutateAsync({
        id: props.recipeId,
        data: { email: email().trim(), permission: permission() },
      });
      setEmail("");
      await refresh();
    } catch {
      return;
    }
  };

  return (
    <Show when={rows()}>
      {(items) => (
        <section class="flex flex-col gap-3">
          <h2 class="text-sm font-medium">Grants</h2>
          <For each={items()}>
            {(grant) => (
              <div class="flex items-center justify-between gap-2 text-xs">
                <span>
                  {grant.email} · {grant.permission}
                </span>
                <Button
                  type="button"
                  onClick={() => {
                    void revoke
                      .mutateAsync({ id: props.recipeId, userId: String(grant.userId) })
                      .then(() => refresh())
                      .catch(() => undefined);
                  }}
                >
                  Remove
                </Button>
              </div>
            )}
          </For>
          <form class="grid gap-2 sm:grid-cols-[1fr_8rem_auto]" onSubmit={onGrant}>
            <Input value={email()} onChange={setEmail} required>
              <Input.Label>Email</Input.Label>
              <Input.Input type="email" />
            </Input>
            <Field>
              <Label for="grant-permission">Permission</Label>
              <NativeSelect
                id="grant-permission"
                value={permission()}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (value === "read" || value === "write") setPermission(value);
                }}
              >
                <option value="read">read</option>
                <option value="write">write</option>
              </NativeSelect>
            </Field>
            <Button type="submit" class="self-end" disabled={upsert.isPending}>
              Grant
            </Button>
          </form>
          <Show when={upsert.error}>
            <Alert>
              <Alert.Title>Could not update grants</Alert.Title>
              <Alert.Description>{upsert.error?.message}</Alert.Description>
            </Alert>
          </Show>
        </section>
      )}
    </Show>
  );
}

function recipeDetail(result: getRecipeResponse | undefined): RecipeDetail | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}

function grantRows(result: listRecipeGrantsResponse | undefined): RecipeGrant[] | undefined {
  if (!result || result.status !== 200) return undefined;
  return result.data;
}
