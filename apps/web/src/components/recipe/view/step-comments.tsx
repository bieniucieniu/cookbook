import { IconChevronDown, IconMessageCircle, IconTrash } from "@/components/icons";
import { Button, buttonVariants } from "@/components/m3/button";
import { IconButton } from "@/components/m3/icon-button";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import type { CommentResponse } from "@/generated/model";
import { Recipes } from "@/generated/recipes/recipes";
import { createSubmit } from "@/lib/submit";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/solid/collapsible";
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
  const [body, setBody] = createSignal("");
  const [posting, post] = createSubmit();
  const [removing, remove] = createSubmit();
  const mine = () => props.comments.filter((comment) => comment.stepKey === props.stepKey);

  return (
    <Collapsible class="flex flex-col gap-2">
      <CollapsibleTrigger
        class={buttonVariants({ variant: "text", class: "group/comments w-fit" })}
      >
        <IconMessageCircle aria-hidden="true" />
        {mine().length === 0 ? "Comments" : `Comments (${mine().length})`}
        <IconChevronDown
          aria-hidden="true"
          class="motion-fast group-data-open/comments:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsiblePanel class="flex flex-col gap-2">
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
                    disabled={removing()}
                    onClick={() => {
                      void remove("delete the comment", () =>
                        Recipes.deleteRecipeComment(props.recipeId, String(comment.id))
                      );
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
              void post("post the comment", () =>
                Recipes.createRecipeComment(props.recipeId, { stepKey: props.stepKey, body: text })
              ).then((posted) => {
                if (posted) setBody("");
              });
            }}
          >
            <TextField variant="outlined" class="flex-1">
              <TextFieldContainer>
                <TextFieldLabel>Comment</TextFieldLabel>
                <TextFieldInput value={body()} onValueChange={setBody} />
              </TextFieldContainer>
            </TextField>
            <Button type="submit" variant="tonal" size="md" disabled={posting()}>
              Post
            </Button>
          </form>
        </Show>
      </CollapsiblePanel>
    </Collapsible>
  );
}
