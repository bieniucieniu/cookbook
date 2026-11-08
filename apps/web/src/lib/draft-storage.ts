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

export function saveDraft(recipeId: string | undefined, draft: RecipeDraft): void {
  try {
    localStorage.setItem(storageKey(recipeId), JSON.stringify({ version, draft }));
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
