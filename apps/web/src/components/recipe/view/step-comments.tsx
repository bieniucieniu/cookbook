import { IconChevronDown, IconMessageCircle, IconTrash } from "@/components/icons";
import { Collapsible } from "@kobalte/core/collapsible";
import { Button } from "@/components/m3/button";
import { IconButton } from "@/components/m3/icon-button";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import { notifyError } from "@/components/notify";
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

/**
 * Comments on one step, folded away behind a toggle that shows the count. Plain text, not
 * markdown.
 */
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
    <Collapsible class="flex flex-col gap-2">
      <Collapsible.Trigger as={Button} variant="text" class="group/comments w-fit">
        <IconMessageCircle aria-hidden="true" />
        {mine().length === 0 ? "Comments" : `Comments (${mine().length})`}
        <IconChevronDown
          aria-hidden="true"
          class="motion-fast group-data-expanded/comments:rotate-180"
        />
      </Collapsible.Trigger>
      <Collapsible.Content class="flex flex-col gap-2">
        <div class="flex flex-col divide-y divide-outline-variant">
          <For each={mine()}>
            {(comment) => (
              <article class="flex items-start gap-2 py-3 pr-1">
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
                        .catch((error: unknown) => notifyError("delete the comment", error));
                    }}
                  >
                    <IconTrash aria-hidden="true" />
                  </IconButton>
                </Show>
              </article>
            )}
          </For>
        </div>
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
                .catch((error: unknown) => notifyError("post the comment", error));
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
      </Collapsible.Content>
    </Collapsible>
  );
}
