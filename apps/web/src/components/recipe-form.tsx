import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateRecipe, useUpdateRecipe } from "@/generated/recipes/recipes";
import { ApiError } from "@/mutator";
import { blankNode, draftToWrite, nextStepKey, type RecipeDraft } from "@/lib/recipe-draft";
import { photoForUpload, uploadPhotoFile } from "@/lib/photos";
import { useNavigate } from "@tanstack/solid-router";
import { createSignal, For, Index, Show } from "solid-js";
import { createStore } from "solid-js/store";

export function RecipeForm(props: { initial: RecipeDraft; recipeId?: string }) {
  const navigate = useNavigate();
  const [draft, setDraft] = createStore<RecipeDraft>(props.initial);
  const [uploadError, setUploadError] = createSignal<string>();
  const [uploading, setUploading] = createSignal(false);
  const create = useCreateRecipe();
  const update = useUpdateRecipe();

  const pending = () => create.isPending || update.isPending || uploading();
  const failure = () => create.error ?? update.error;

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const data = draftToWrite(draft);
    const recipeId = props.recipeId;
    try {
      if (recipeId) {
        await update.mutateAsync({ id: recipeId, data });
        await navigate({ to: "/recipes/$id", params: { id: recipeId } });
        return;
      }
      const created = await create.mutateAsync({ data });
      if (created.status !== 201) return;
      await navigate({ to: "/recipes/$id", params: { id: String(created.data.id) } });
    } catch {
      return;
    }
  };

  const onPhoto = async (event: Event) => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    setUploadError(undefined);
    setUploading(true);
    try {
      const prepared = await photoForUpload(file);
      const created = await uploadPhotoFile(prepared);
      setDraft("photos", (photos) => [...photos, { id: created.id, alt: "" }]);
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : "Could not upload the photo");
    } finally {
      setUploading(false);
    }
  };

  const addStep = () => {
    const key = nextStepKey(draft.nodes);
    setDraft("nodes", (nodes) => [...nodes, blankNode(nodes.length, key)]);
  };

  const removeStep = (index: number) => {
    const key = draft.nodes[index]?.key;
    if (!key || draft.nodes.length < 2) return;
    setDraft(
      "nodes",
      draft.nodes
        .filter((_, nodeIndex) => nodeIndex !== index)
        .map((node, ord) => ({ ...node, ord }))
    );
    setDraft(
      "edges",
      draft.edges.filter((edge) => edge.from !== key && edge.to !== key)
    );
    setDraft(
      "ingredientAlts",
      draft.ingredientAlts.map((alt) => (alt.nodeKey === key ? { ...alt, nodeKey: null } : alt))
    );
    setDraft(
      "toolAlts",
      draft.toolAlts.map((alt) => (alt.nodeKey === key ? { ...alt, nodeKey: null } : alt))
    );
  };

  return (
    <form class="flex flex-col gap-4" onSubmit={onSubmit}>
      <Show when={failure()}>
        <Alert>
          <Alert.Title>Could not save the recipe</Alert.Title>
          <Alert.Description>{failure()?.message}</Alert.Description>
        </Alert>
      </Show>
      <Input value={draft.title} onChange={(value) => setDraft("title", value)} required>
        <Input.Label>Title</Input.Label>
        <Input.Input />
      </Input>
      <Textarea value={draft.description} onChange={(value) => setDraft("description", value)}>
        <Textarea.Label>Description</Textarea.Label>
        <Textarea.TextArea />
      </Textarea>
      <Textarea value={draft.notes} onChange={(value) => setDraft("notes", value)}>
        <Textarea.Label>Notes</Textarea.Label>
        <Textarea.TextArea />
      </Textarea>
      <div class="grid gap-3 sm:grid-cols-2">
        <Input
          value={String(draft.cooks)}
          onChange={(value) => {
            const parsed = Number(value);
            if (Number.isInteger(parsed) && parsed >= 1) setDraft("cooks", parsed);
          }}
        >
          <Input.Label>Cooks</Input.Label>
          <Input.Input inputMode="numeric" />
        </Input>
        <Field>
          <Label for="recipe-visibility">Visibility</Label>
          <NativeSelect
            id="recipe-visibility"
            value={draft.visibility}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === "public" || value === "private") setDraft("visibility", value);
            }}
          >
            <option value="public">public</option>
            <option value="private">private</option>
          </NativeSelect>
        </Field>
      </div>
      <Field>
        <Label for="recipe-photo">Photo</Label>
        <input
          id="recipe-photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="text-xs"
          onChange={onPhoto}
        />
        <Show when={uploadError()}>
          <Field.Error>{uploadError()}</Field.Error>
        </Show>
      </Field>
      <Index each={draft.photos}>
        {(photo, index) => (
          <div class="flex flex-col gap-2">
            <img
              src={`/api/photos/${photo().id}`}
              alt={photo().alt}
              class="max-h-48 w-fit rounded-md"
            />
            <Input
              value={photo().alt}
              onChange={(value) => setDraft("photos", index, "alt", value)}
            >
              <Input.Label>Alt</Input.Label>
              <Input.Input />
            </Input>
            <Button
              type="button"
              onClick={() =>
                setDraft("photos", (photos) =>
                  photos.filter((_, photoIndex) => photoIndex !== index)
                )
              }
            >
              Remove photo
            </Button>
          </div>
        )}
      </Index>
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium">Steps</h2>
        <Index each={draft.nodes}>
          {(node, index) => (
            <div class="flex flex-col gap-2 rounded-lg p-3 ring-1 ring-foreground/10">
              <p class="text-xs text-muted-foreground">{node().key}</p>
              <Input
                value={node().title}
                onChange={(value) => setDraft("nodes", index, "title", value)}
                required
              >
                <Input.Label>Step title</Input.Label>
                <Input.Input />
              </Input>
              <Textarea
                value={node().body}
                onChange={(value) => setDraft("nodes", index, "body", value)}
              >
                <Textarea.Label>Step body</Textarea.Label>
                <Textarea.TextArea />
              </Textarea>
              <Show when={draft.nodes.length > 1}>
                <Button type="button" onClick={() => removeStep(index)}>
                  Remove step
                </Button>
              </Show>
            </div>
          )}
        </Index>
        <Button type="button" onClick={addStep}>
          Add step
        </Button>
      </section>
      <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium">Edges</h2>
        <Index each={draft.edges}>
          {(edge, index) => (
            <div class="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <Field>
                <Label>From</Label>
                <NativeSelect
                  value={edge().from}
                  onChange={(event) => setDraft("edges", index, "from", event.currentTarget.value)}
                >
                  <For each={draft.nodes}>
                    {(node) => <option value={node.key}>{node.title || node.key}</option>}
                  </For>
                </NativeSelect>
              </Field>
              <Field>
                <Label>To</Label>
                <NativeSelect
                  value={edge().to}
                  onChange={(event) => setDraft("edges", index, "to", event.currentTarget.value)}
                >
                  <For each={draft.nodes}>
                    {(node) => <option value={node.key}>{node.title || node.key}</option>}
                  </For>
                </NativeSelect>
              </Field>
              <Input
                value={edge().label}
                onChange={(value) => setDraft("edges", index, "label", value)}
              >
                <Input.Label>Label</Input.Label>
                <Input.Input />
              </Input>
              <Button
                type="button"
                class="self-end"
                onClick={() =>
                  setDraft("edges", (edges) => edges.filter((_, edgeIndex) => edgeIndex !== index))
                }
              >
                Remove
              </Button>
            </div>
          )}
        </Index>
        <Button
          type="button"
          onClick={() => {
            const from = draft.nodes[0]?.key ?? "";
            const to = draft.nodes[1]?.key ?? from;
            setDraft("edges", (edges) => [...edges, { from, to, label: "" }]);
          }}
        >
          Add edge
        </Button>
      </section>
      <Button type="submit" disabled={pending()}>
        Save
      </Button>
    </form>
  );
}
