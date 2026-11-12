import { IconTrash } from "@/components/icons";
import { Button } from "@/components/m3/button";
import { IconButton } from "@/components/m3/icon-button";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import { notify } from "@/components/notify";
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

function failure(action: string, error: unknown): string {
  return `Could not ${action}${error instanceof Error ? `: ${error.message}` : "."}`;
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
          <article class="flex items-start gap-2 rounded-medium bg-surface-container py-2 pr-1 pl-3">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <p class="typescale-label-medium text-on-surface-variant">
                {comment.email} · {formatTime(comment.createdAt)}
              </p>
              <p class="typescale-body-medium text-on-surface">{comment.body}</p>
            </div>
            <Show
              when={
                props.userId != null &&
                (comment.userId === props.userId || props.ownerId === props.userId)
              }
            >
              <IconButton
                size="xs"
                aria-label="Delete comment"
                disabled={remove.isPending}
                onClick={() => {
                  void remove
                    .mutateAsync({ id: props.recipeId, commentId: String(comment.id) })
                    .then(() => refresh())
                    .catch((error: unknown) => notify(failure("delete the comment", error)));
                }}
              >
                <IconTrash aria-hidden="true" />
              </IconButton>
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
              .catch((error: unknown) => notify(failure("post the comment", error)));
          }}
        >
          <TextField variant="outlined" value={body()} onChange={setBody} class="flex-1">
            <TextFieldContainer>
              <TextFieldLabel>Comment</TextFieldLabel>
              <TextFieldInput />
            </TextFieldContainer>
          </TextField>
          <Button type="submit" variant="tonal" size="md" disabled={post.isPending}>
            Post
          </Button>
        </form>
      </Show>
    </div>
  );
}
