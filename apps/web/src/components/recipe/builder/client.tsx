import { preloadCatalog } from "@/lib/catalog";
import { clientOnly, isServer } from "@solidjs/web";

const load = () => import("./recipe-editor");

/** The recipe editor keeps its draft in localStorage, so it renders on the client only. */
export const RecipeEditor = clientOnly(load, { lazy: true });

/** For a route's `preload`: the editor's code and the catalog it reads, fetched together. */
export function preloadEditor(): void {
  preloadCatalog();
  if (!isServer) void load();
}
