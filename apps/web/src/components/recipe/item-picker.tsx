import { IconCarrot, IconPlus, IconToolsKitchen2 } from "@/components/icons";
import type { Catalog, CatalogItem, CatalogKind } from "@/lib/catalog";
import { cn, popupMotion } from "@/lib/utils";
import { dynamic } from "@solidjs/web";
import {
  Combobox,
  ComboboxContent,
  ComboboxCreate,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@ui-sdk/solid/combobox";
import { createMemo, createSignal, For, onSettled, Show } from "solid-js";

type Group = { label: string; items: CatalogItem[] };

const kindLabel: Record<CatalogKind, string> = { ingredient: "Ingredient", tool: "Tool" };

const itemClass =
  "relative flex min-h-12 cursor-pointer items-center gap-3 px-3 typescale-body-large text-on-surface outline-none select-none data-highlighted:bg-on-surface/10 data-pending:opacity-60";

/**
 * M3 has no combobox. This is ui-sdk's, drawn as an outlined text field with a menu-style list
 * (surface-container, 48px rows, state layer on the highlighted row).
 *
 * Combobox over the catalog. Items already picked for the recipe come first. Typing a name
 * that is not there offers "Create". Picking clears the field, so it works as an "add" box.
 */
export function ItemPicker(props: {
  kind: CatalogKind;
  catalog: Catalog;
  picked?: number[];
  exclude?: number[];
  onPick: (id: number) => void;
  label?: string;
  placeholder?: string;
  autofocus?: boolean;
}) {
  const [query, setQuery] = createSignal("");
  const [error, setError] = createSignal<string>();
  let input: HTMLInputElement | undefined;

  const groups = createMemo<Group[]>(() => {
    const excluded = new Set(props.exclude ?? []);
    const picked = new Set(props.picked ?? []);
    const all = props.catalog.items(props.kind).filter((item) => !excluded.has(item.id));
    const result: Group[] = [];
    const first = all.filter((item) => picked.has(item.id));
    if (first.length > 0) result.push({ label: "In this recipe", items: first });
    result.push({ label: "All", items: all.filter((item) => !picked.has(item.id)) });
    return result;
  });

  const pick = (id: number) => {
    setError(undefined);
    setQuery("");
    props.onPick(id);
    // Keep the box ready for the next item.
    queueMicrotask(() => input?.focus());
  };

  const create = async (name: string) => {
    const trimmed = name.trim();
    setError(undefined);
    try {
      const created = await props.catalog.create(props.kind, trimmed);
      pick(created.id);
    } catch {
      setError(`Could not add "${trimmed}"`);
    }
  };

  // `autofocus` only works on page load. Pickers open later, so focus by hand.
  onSettled(() => {
    if (props.autofocus) input?.focus();
  });

  const Icon = dynamic(() => (props.kind === "ingredient" ? IconCarrot : IconToolsKitchen2));

  return (
    <Combobox<string>
      value={null}
      onValueChange={(value) => {
        const id = Number(value);
        if (value != null && Number.isFinite(id)) pick(id);
      }}
      query={query()}
      // Choosing an item would write its label into the box; this is an "add" box, so it empties.
      onQueryChange={(next, details) => setQuery(details.reason === "item-press" ? "" : next)}
      autoHighlight
    >
      <div class="flex flex-col gap-1">
        <div class="group/picker relative">
          <Show when={props.label}>
            <ComboboxLabel class="pointer-events-none absolute -top-2 left-3 z-10 bg-(--text-field-notch,var(--md-sys-color-surface)) px-1 typescale-body-small text-on-surface-variant group-focus-within/picker:text-primary">
              {props.label}
            </ComboboxLabel>
          </Show>
          <div class="flex h-14 items-center gap-3 rounded-extra-small px-3 ring-1 ring-outline ring-inset motion-fast hover:ring-on-surface focus-within:ring-2 focus-within:ring-primary">
            <Icon
              class="size-6 shrink-0 text-on-surface-variant"
              stroke-width={1.75}
              aria-hidden="true"
            />
            <ComboboxInput
              ref={(el) => (input = el)}
              aria-label={props.label ?? kindLabel[props.kind]}
              placeholder={props.placeholder ?? `Add ${kindLabel[props.kind].toLowerCase()}`}
              class="h-full min-w-0 flex-1 bg-transparent typescale-body-large text-on-surface caret-primary outline-none placeholder:text-on-surface-variant"
            />
          </div>
        </div>
        <Show when={error()}>
          <p class="px-4 typescale-body-small text-error" role="alert">
            {error()}
          </p>
        </Show>
        <ComboboxContent
          sideOffset={4}
          class={cn(
            "z-50 w-(--anchor-width) min-w-56 overflow-hidden rounded-extra-small bg-surface-container py-2 shadow-level-2",
            popupMotion
          )}
        >
          <ComboboxList class="max-h-72 overflow-y-auto outline-none">
            <For each={groups()}>
              {(group) => (
                <ComboboxGroup>
                  <ComboboxGroupLabel class="px-3 pt-2 pb-1 typescale-label-medium text-on-surface-variant">
                    {group.label}
                  </ComboboxGroupLabel>
                  <For each={group.items}>
                    {(item) => (
                      <ComboboxItem value={String(item.id)} class={itemClass}>
                        <Icon
                          class="size-5 text-on-surface-variant"
                          stroke-width={1.75}
                          aria-hidden="true"
                        />
                        <span>{item.name}</span>
                      </ComboboxItem>
                    )}
                  </For>
                </ComboboxGroup>
              )}
            </For>
            <ComboboxCreate onCreate={create} class={itemClass}>
              {(state) => (
                <>
                  <IconPlus class="size-5 text-primary" aria-hidden="true" />
                  <span>
                    Create <strong class="font-medium">{state.query}</strong>
                  </span>
                </>
              )}
            </ComboboxCreate>
          </ComboboxList>
        </ComboboxContent>
      </div>
    </Combobox>
  );
}
