import { photoUrl } from "@/lib/api";
import { IconLock, IconNote, IconPhoto, IconTrash, IconUsers, IconWorld } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { photoForUpload, uploadPhotoFile } from "@/lib/photos";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { ApiError } from "@/mutator";
import { createSignal, For, Show } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { MarkdownEditor } from "../markdown";
import { IconLabel, Stepper } from "../parts";

/** Recipe-wide settings: photos, cooks, who can see it, tips. Name and intro live in the summary. */
export function DetailsEditor(props: {
  draft: RecipeDraft;
  setDraft: SetStoreFunction<RecipeDraft>;
}) {
  const [uploading, setUploading] = createSignal(false);
  const [uploadError, setUploadError] = createSignal<string>();
  let fileInput: HTMLInputElement | undefined;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(undefined);
    setUploading(true);
    try {
      const created = await uploadPhotoFile(await photoForUpload(file));
      props.setDraft("photos", (photos) => [...photos, { id: created.id, alt: "" }]);
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : "Could not upload the photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <h2 class="text-lg font-bold">Recipe details</h2>
      <section class="flex flex-col gap-2" aria-label="Photo">
        <Show
          when={props.draft.photos.length > 0}
          fallback={
            <button
              type="button"
              class="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/40 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
              disabled={uploading()}
              onClick={() => fileInput?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void upload(event.dataTransfer?.files[0]);
              }}
            >
              <IconPhoto size={40} stroke={1.5} aria-hidden="true" />
              {uploading() ? "Uploading…" : "Add a photo of the dish"}
            </button>
          }
        >
          <div class="flex gap-2 overflow-x-auto pb-1">
            <For each={props.draft.photos}>
              {(photo, index) => (
                <figure class="relative shrink-0">
                  <img
                    src={photoUrl(photo.id)}
                    alt={photo.alt}
                    class="h-40 rounded-xl object-cover"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    class="absolute top-2 right-2"
                    aria-label="Remove photo"
                    onClick={() =>
                      props.setDraft("photos", (photos) => photos.filter((_, at) => at !== index()))
                    }
                  >
                    <IconTrash aria-hidden="true" />
                  </Button>
                </figure>
              )}
            </For>
            <button
              type="button"
              class="flex h-40 w-28 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground hover:bg-muted"
              disabled={uploading()}
              onClick={() => fileInput?.click()}
            >
              <IconPhoto size={24} aria-hidden="true" />
              {uploading() ? "Uploading…" : "Add"}
            </button>
          </div>
        </Show>
        <input
          ref={(element) => (fileInput = element)}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void upload(file);
          }}
        />
        <Show when={uploadError()}>
          <p class="text-sm text-destructive" role="alert">
            {uploadError()}
          </p>
        </Show>
      </section>

      <div class="flex flex-wrap items-end gap-6">
        <div class="flex flex-col gap-2">
          <IconLabel icon={IconUsers} label="Cooks" class="text-sm font-medium" />
          <Stepper
            label="cooks"
            value={props.draft.cooks}
            onChange={(value) => props.setDraft("cooks", value)}
            max={12}
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">Who can see it</span>
          <ToggleGroup
            variant="outline"
            spacing={0}
            value={props.draft.visibility}
            onChange={(value) => {
              if (value === "public" || value === "private") props.setDraft("visibility", value);
            }}
          >
            <ToggleGroupItem value="public" class="h-10 gap-1.5 px-3 text-sm">
              <IconWorld size={18} aria-hidden="true" />
              Everyone
            </ToggleGroupItem>
            <ToggleGroupItem value="private" class="h-10 gap-1.5 px-3 text-sm">
              <IconLock size={18} aria-hidden="true" />
              Only me
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <IconLabel icon={IconNote} label="Tips" class="text-sm font-medium" />
        <MarkdownEditor
          label="Tips"
          placeholder="Optional. Storage, serving, swaps."
          defaultValue={props.draft.notes}
          onChange={(value) => props.setDraft("notes", value)}
        />
      </div>
    </div>
  );
}
