import { IconCarrot, IconPlus, IconToolsKitchen2 } from "@/components/icons";
import { Combobox as ComboboxPrimitive } from "@kobalte/core/combobox";
import type { Catalog, CatalogKind } from "@/lib/catalog";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { Dynamic } from "solid-js/web";

type Option = {
  key: string;
  id: number | null;
  name: string;
  group: "picked" | "catalog" | "create";
};

type Group = { label: string; options: Option[] };

const kindLabel: Record<CatalogKind, string> = { ingredient: "Ingredient", tool: "Tool" };

/**
 * M3 has no combobox. This is Kobalte's, drawn as an outlined text field with a menu-style list
 * (surface-container, 48px rows, state layer on the highlighted row).
 *
 * Combobox over the catalog. Items already picked for the recipe come first. Typing a name
 * that is not there offers "Create". Picking resets the field, so it works as an "add" box.
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
  const [version, setVersion] = createSignal(0);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal<string>();

  const groups = createMemo<Group[]>(() => {
    const excluded = new Set(props.exclude ?? []);
    const picked = new Set(props.picked ?? []);
    const all = props.catalog.items(props.kind).filter((item) => !excluded.has(item.id));
    const text = query().trim();
    const exact = all.some((item) => item.name.toLowerCase() === text.toLowerCase());
    const toOption = (group: Option["group"]) => (item: { id: number; name: string }) => ({
      key: `${group}:${item.id}`,
      id: item.id,
      name: item.name,
      group,
    });
    const result: Group[] = [];
    const first = all.filter((item) => picked.has(item.id)).map(toOption("picked"));
    if (first.length > 0) result.push({ label: "In this recipe", options: first });
    result.push({
      label: "All",
      options: all.filter((item) => !picked.has(item.id)).map(toOption("catalog")),
    });
    if (text && !exact) {
      result.push({
        label: "New",
        options: [{ key: `create:${text}`, id: null, name: text, group: "create" }],
      });
    }
    return result;
  });

  const choose = async (option: Option | null) => {
    if (!option) return;
    setError(undefined);
    try {
      if (option.id != null) {
        props.onPick(option.id);
      } else {
        setBusy(true);
        const created = await props.catalog.create(props.kind, option.name);
        props.onPick(created.id);
      }
    } catch {
      setError(`Could not add "${option.name}"`);
    } finally {
      setBusy(false);
      setQuery("");
      setVersion((value) => value + 1);
    }
  };

  const icon = () => (props.kind === "ingredient" ? IconCarrot : IconToolsKitchen2);

  return (
    // Keyed on `version`: a fresh combobox after each pick clears its text field.
    <Show when={version() + 1} keyed>
      <ComboboxPrimitive<Option, Group>
        gutter={4}
        class="flex flex-col gap-1 data-disabled:opacity-38"
        options={groups()}
        optionValue="key"
        optionLabel="name"
        optionTextValue="name"
        optionGroupChildren="options"
        value={null}
        onChange={(option) => void choose(option)}
        onInputChange={setQuery}
        placeholder={props.placeholder ?? `Add ${kindLabel[props.kind].toLowerCase()}`}
        disabled={busy()}
        defaultFilter={(option, input) =>
          option.group === "create" || option.name.toLowerCase().includes(input.toLowerCase())
        }
        sectionComponent={(section) => (
          <ComboboxPrimitive.Section class="px-3 pt-2 pb-1 typescale-label-medium text-on-surface-variant">
            {section.section.rawValue.label}
          </ComboboxPrimitive.Section>
        )}
        itemComponent={(item) => (
          <ComboboxPrimitive.Item
            item={item.item}
            class="relative flex min-h-12 cursor-pointer items-center px-3 typescale-body-large text-on-surface outline-none select-none data-highlighted:bg-on-surface/10"
          >
            <ComboboxPrimitive.ItemLabel class="flex items-center gap-3">
              <Switch>
                <Match when={item.item.rawValue.group === "create"}>
                  <IconPlus class="size-5 text-primary" aria-hidden="true" />
                  <span>
                    Create <strong class="font-medium">{item.item.rawValue.name}</strong>
                  </span>
                </Match>
                <Match when={true}>
                  <Dynamic
                    component={icon()}
                    class="size-5 text-on-surface-variant"
                    stroke={1.75}
                    aria-hidden="true"
                  />
                  <span>{item.item.rawValue.name}</span>
                </Match>
              </Switch>
            </ComboboxPrimitive.ItemLabel>
          </ComboboxPrimitive.Item>
        )}
      >
        <div class="group/picker relative">
          <Show when={props.label}>
            <ComboboxPrimitive.Label class="pointer-events-none absolute -top-2 left-3 z-10 bg-(--text-field-notch,var(--md-sys-color-surface)) px-1 typescale-body-small text-on-surface-variant group-focus-within/picker:text-primary">
              {props.label}
            </ComboboxPrimitive.Label>
          </Show>
          <ComboboxPrimitive.Control
            class="flex h-14 items-center gap-3 rounded-extra-small px-3 ring-1 ring-outline ring-inset motion-fast hover:ring-on-surface focus-within:ring-2 focus-within:ring-primary"
            aria-label={props.label ?? kindLabel[props.kind]}
          >
            <Dynamic
              component={icon()}
              class="size-6 shrink-0 text-on-surface-variant"
              stroke={1.75}
              aria-hidden="true"
            />
            <ComboboxPrimitive.Input
              class="h-full min-w-0 flex-1 bg-transparent typescale-body-large text-on-surface caret-primary outline-none placeholder:text-on-surface-variant"
              ref={(element: HTMLInputElement) => {
                // `autofocus` only works on page load. Pickers open later, so focus by hand.
                if (props.autofocus || version() > 0) queueMicrotask(() => element.focus());
              }}
            />
          </ComboboxPrimitive.Control>
        </div>
        <Show when={error()}>
          <p class="px-4 typescale-body-small text-error" role="alert">
            {error()}
          </p>
        </Show>
        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Content class="z-50 w-(--kb-popper-anchor-width) min-w-56 origin-(--kb-combobox-content-transform-origin) overflow-hidden rounded-extra-small bg-surface-container py-2 shadow-level-2 data-expanded:animate-in data-expanded:fade-in-0 data-closed:animate-out data-closed:fade-out-0">
            <ComboboxPrimitive.Listbox class="max-h-72 overflow-y-auto outline-none" />
          </ComboboxPrimitive.Content>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive>
    </Show>
  );
}
