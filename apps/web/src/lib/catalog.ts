import {
  createIngredient,
  getListIngredientsQueryKey,
  useListIngredients,
} from "@/generated/ingredients/ingredients";
import { createTool, getListToolsQueryKey, useListTools } from "@/generated/tools/tools";
import { useQueryClient } from "@tanstack/solid-query";
import { createMemo, type Accessor } from "solid-js";

export type CatalogKind = "ingredient" | "tool";

export type CatalogItem = { id: number; slug: string; name: string };

export type Catalog = {
  items: (kind: CatalogKind) => CatalogItem[];
  name: (kind: CatalogKind, id: number) => string;
  create: (kind: CatalogKind, name: string) => Promise<CatalogItem>;
  loading: Accessor<boolean>;
};

/**
 * ASCII slug for the catalog API (`[a-z0-9]+(-[a-z0-9]+)*`). Accents fold to plain letters.
 * Letters with no ASCII form (Cyrillic, CJK, …) are dropped, so a short hash of the whole name
 * keeps the slug non-empty and distinct from a Latin name it would otherwise collide with.
 */
export function slugify(name: string): string {
  const folded = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const ascii = folded.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const lost = /[\u0080-\uffff]/.test(folded);
  if (!lost) return ascii;
  return ascii ? `${ascii}-${nameHash(folded)}` : `item-${nameHash(folded)}`;
}

/** FNV-1a over the UTF-16 code units, in base 36. Stable across sessions. */
function nameHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function listed(data: { status: number; data: unknown } | undefined): CatalogItem[] {
  if (!data || data.status !== 200 || !Array.isArray(data.data)) return [];
  const items: CatalogItem[] = [];
  for (const row of data.data) {
    if (row && typeof row === "object" && "id" in row && typeof row.id === "number") {
      const name = "name" in row && typeof row.name === "string" ? row.name : "";
      const slug = "slug" in row && typeof row.slug === "string" ? row.slug : "";
      items.push({ id: row.id, slug, name });
    }
  }
  return items.sort((left, right) => left.name.localeCompare(right.name));
}

export function useCatalog(): Catalog {
  const queryClient = useQueryClient();
  const ingredients = useListIngredients();
  const tools = useListTools();
  const ingredientItems = createMemo(() => listed(ingredients.data));
  const toolItems = createMemo(() => listed(tools.data));
  const ingredientNames = createMemo(
    () => new Map(ingredientItems().map((item) => [item.id, item.name]))
  );
  const toolNames = createMemo(() => new Map(toolItems().map((item) => [item.id, item.name])));

  return {
    items: (kind) => (kind === "ingredient" ? ingredientItems() : toolItems()),
    name: (kind, id) =>
      (kind === "ingredient" ? ingredientNames() : toolNames()).get(id) ?? `#${id}`,
    loading: () => ingredients.isPending || tools.isPending,
    async create(kind, name) {
      const trimmed = name.trim();
      const data = { name: trimmed, slug: slugify(trimmed) };
      if (kind === "ingredient") {
        const created = await createIngredient(data);
        await queryClient.invalidateQueries({ queryKey: getListIngredientsQueryKey() });
        return createdItem(created.data);
      }
      const created = await createTool(data);
      await queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
      return createdItem(created.data);
    },
  };
}

/** A create without an id cannot be picked: fail so the picker shows its error, not item #0. */
function createdItem(data: { id?: number | null; slug: string; name: string }): CatalogItem {
  if (typeof data.id !== "number") throw new Error(`Created "${data.name}" has no id`);
  return { id: data.id, slug: data.slug, name: data.name };
}
