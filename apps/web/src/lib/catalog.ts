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

export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
        return { id: created.data.id ?? 0, slug: created.data.slug, name: created.data.name };
      }
      const created = await createTool(data);
      await queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
      return { id: created.data.id ?? 0, slug: created.data.slug, name: created.data.name };
    },
  };
}
