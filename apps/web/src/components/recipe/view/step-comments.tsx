import { IconTrash } from "@/components/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, InputControl, InputLabel } from "@/components/ui/input";
import type { CommentResponse } from "@/generated/model";
import {
  getGetRecipeQueryKey,
  useCreateRecipeComment,
  useDeleteRecipeComment,
} from "@/generated/recipes/recipes";
import { useQueryClient } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString();
}

/** Comments on one step. Plain text, not markdown. */
export function StepComments(props: {
  recipeId: string;
  stepKey: string;
  comments: CommentResponse[];
  userId: number | undefined;
  ownerId: number | null | undefined;
}) {
  const queryClient = useQueryClient();
  const post = useCreateRecipeComment();
  const remove = useDeleteRecipeComment();
  const [body, setBody] = createSignal("");
  const mine = () => props.comments.filter((comment) => comment.stepKey === props.stepKey);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: getGetRecipeQueryKey(props.recipeId) });

  return (
    <div class="flex flex-col gap-2">
      <For each={mine()}>
        {(comment) => (
          <article class="flex items-start gap-2 rounded-md bg-muted/50 p-2">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <p class="text-xs text-muted-foreground">
                {comment.email} · {formatTime(comment.createdAt)}
              </p>
              <p class="text-sm">{comment.body}</p>
            </div>
            <Show
              when={
                props.userId != null &&
                (comment.userId === props.userId || props.ownerId === props.userId)
              }
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Delete comment"
                disabled={remove.isPending}
                onClick={() => {
                  void remove
                    .mutateAsync({ id: props.recipeId, commentId: String(comment.id) })
                    .then(() => refresh())
                    .catch(() => undefined);
                }}
              >
                <IconTrash aria-hidden="true" />
              </Button>
            </Show>
          </article>
        )}
      </For>
      <Show when={props.userId != null}>
        <form
          class="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const text = body().trim();
            if (!text) return;
            void post
              .mutateAsync({ id: props.recipeId, data: { stepKey: props.stepKey, body: text } })
              .then(() => {
                setBody("");
                return refresh();
              })
              .catch(() => undefined);
          }}
        >
          <Input value={body()} onChange={setBody} class="flex-1">
            <InputLabel>Comment</InputLabel>
            <InputControl class="h-9" />
          </Input>
          <Button type="submit" variant="outline" class="h-9" disabled={post.isPending}>
            Post
          </Button>
        </form>
      </Show>
      <Show when={post.error}>
        <Alert variant="destructive">
          <AlertTitle>Could not post the comment</AlertTitle>
          <AlertDescription>{post.error?.message}</AlertDescription>
        </Alert>
      </Show>
    </div>
  );
}
