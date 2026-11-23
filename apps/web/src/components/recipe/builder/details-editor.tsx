import { photoUrl } from "@/lib/api";
import { IconLock, IconNote, IconPhoto, IconTrash, IconUsers, IconWorld } from "@/components/icons";
import { ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import { IconButton } from "@/components/m3/icon-button";
import { photoForUpload, uploadPhotoFile } from "@/lib/photos";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { ApiError } from "@/mutator";
import { createSignal, For, Show } from "solid-js";
import type { DraftActions } from "./actions";
import { MarkdownEditor } from "../markdown";
import { IconLabel, Stepper } from "../parts";

/** Recipe-wide settings: photos, cooks, who can see it, tips. Name and intro live in the summary. */
export function DetailsEditor(props: { draft: RecipeDraft; actions: DraftActions }) {
  const [uploading, setUploading] = createSignal(false);
  const [uploadError, setUploadError] = createSignal<string>();
  let fileInput: HTMLInputElement | undefined;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(undefined);
    setUploading(true);
    try {
      const created = await uploadPhotoFile(await photoForUpload(file));
      props.actions.setRecipe("photos", [...props.draft.photos, { id: created.id, alt: "" }]);
    } catch (error) {
      setUploadError(error instanceof ApiError ? error.message : "Could not upload the photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <h2 class="typescale-headline-small text-on-surface">Recipe details</h2>
      <section class="flex flex-col gap-2" aria-label="Photo">
        <Show
          when={props.draft.photos.length > 0}
          fallback={
            <button
              type="button"
              class="relative flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-extra-large border-2 border-dashed border-outline-variant bg-surface-container-low typescale-label-large text-on-surface-variant state-layer focus-ring"
              disabled={uploading()}
              onClick={() => fileInput?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                void upload(event.dataTransfer?.files[0]);
              }}
            >
              <IconPhoto size={40} stroke-width={1.5} aria-hidden="true" />
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
                    class="h-40 rounded-extra-large object-cover"
                  />
                  <IconButton
                    variant="tonal"
                    class="absolute top-2 right-2"
                    aria-label="Remove photo"
                    onClick={() =>
                      props.actions.setRecipe(
                        "photos",
                        props.draft.photos.filter((_, at) => at !== index())
                      )
                    }
                  >
                    <IconTrash aria-hidden="true" />
                  </IconButton>
                </figure>
              )}
            </For>
            <button
              type="button"
              class="relative flex h-40 w-28 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-extra-large border-2 border-dashed border-outline-variant typescale-label-medium text-on-surface-variant state-layer focus-ring"
              disabled={uploading()}
              onClick={() => fileInput?.click()}
            >
              <IconPhoto size={24} aria-hidden="true" />
              {uploading() ? "Uploading…" : "Add"}
            </button>
          </div>
        </Show>
        <input
          ref={(el) => (fileInput = el)}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="sr-only"
          tabindex={-1}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void upload(file);
          }}
        />
        <Show when={uploadError()}>
          <p class="typescale-body-medium text-error" role="alert">
            {uploadError()}
          </p>
        </Show>
      </section>

      <div class="flex flex-wrap items-end gap-6">
        <div class="flex flex-col gap-2">
          <IconLabel
            icon={IconUsers}
            label="Cooks"
            class="typescale-label-large text-on-surface-variant"
          />
          <Stepper
            label="cooks"
            value={props.draft.cooks}
            onChange={(value) => props.actions.setRecipe("cooks", value)}
            max={12}
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="typescale-label-large text-on-surface-variant">Who can see it</span>
          <ButtonGroup variant="connected" size="sm" aria-label="Who can see it">
            <ToggleButton
              variant="tonal"
              pressed={props.draft.visibility === "public"}
              onPressedChange={() => props.actions.setRecipe("visibility", "public")}
            >
              <IconWorld aria-hidden="true" />
              Everyone
            </ToggleButton>
            <ToggleButton
              variant="tonal"
              pressed={props.draft.visibility === "private"}
              onPressedChange={() => props.actions.setRecipe("visibility", "private")}
            >
              <IconLock aria-hidden="true" />
              Only me
            </ToggleButton>
          </ButtonGroup>
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <IconLabel
          icon={IconNote}
          label="Tips"
          class="typescale-label-large text-on-surface-variant"
        />
        <MarkdownEditor
          label="Tips"
          placeholder="Optional. Storage, serving, swaps."
          defaultValue={props.draft.notes}
          onChange={(value) => props.actions.setRecipe("notes", value)}
        />
      </div>
    </div>
  );
}
