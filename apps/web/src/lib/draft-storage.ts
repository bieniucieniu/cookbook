import type { RecipeDraft } from "@/lib/recipe-draft";

const version = 2;

function storageKey(recipeId: string | undefined): string {
  return `cookbook:draft:${recipeId ?? "new"}`;
}

export function loadDraft(recipeId: string | undefined): RecipeDraft | undefined {
  try {
    const raw = localStorage.getItem(storageKey(recipeId));
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return undefined;
    if (!("version" in parsed) || parsed.version !== version) return undefined;
    if (!("draft" in parsed)) return undefined;
    return parsed.draft as RecipeDraft;
  } catch {
    return undefined;
  }
}

/** Saves a draft the caller already serialized (`JSON.stringify(draft)`), without a second pass. */
export function saveDraft(recipeId: string | undefined, draftJson: string): void {
  try {
    localStorage.setItem(storageKey(recipeId), `{"version":${version},"draft":${draftJson}}`);
  } catch {
    return;
  }
}

export function clearDraft(recipeId: string | undefined): void {
  try {
    localStorage.removeItem(storageKey(recipeId));
  } catch {
    return;
  }
}
