import type { DraftEdge, DraftNode } from "@/lib/recipe-draft";
import { xorArmSteps } from "@/lib/recipe-graph";

export type SummaryAmount = { qty: number | null; unit: string | null };

export type SummarySwap = {
  id: number;
  ratio: number;
  note: string;
  stepKeys: string[];
};

/** One recipe-level line. Mirrors `RecipeDetail.summary` on the API (docs/recipes.md). */
export type SummaryLine = {
  kind: "ingredient" | "tool";
  id: number;
  amounts: SummaryAmount[];
  optional: boolean;
  /** Optional in some steps and required in others. Save is blocked. */
  conflict: boolean;
  optionalSteps: string[];
  requiredSteps: string[];
  stepKeys: string[];
  alts: SummarySwap[];
  /** Every step that uses it sits in an `xor` arm. */
  onlyInAlternative: boolean;
};

export type RecipeSummary = {
  ingredients: SummaryLine[];
  tools: SummaryLine[];
};

type Use = {
  stepKey: string;
  id: number;
  qty: number | null;
  unit: string | null;
  optional: boolean;
  alts: { id: number; ratio: number; note: string }[];
};

function line(kind: SummaryLine["kind"], uses: Use[], armSteps: Set<string>): SummaryLine {
  const amounts = new Map<string, SummaryAmount>();
  const alts = new Map<number, SummarySwap>();
  for (const use of uses) {
    const unit = use.unit?.trim() || null;
    const known = amounts.get(unit ?? "");
    if (!known) amounts.set(unit ?? "", { qty: use.qty, unit });
    else if (use.qty != null) known.qty = (known.qty ?? 0) + use.qty;
    for (const alt of use.alts) {
      const swap = alts.get(alt.id);
      if (swap) {
        if (!swap.stepKeys.includes(use.stepKey)) swap.stepKeys.push(use.stepKey);
      } else {
        alts.set(alt.id, { ...alt, stepKeys: [use.stepKey] });
      }
    }
  }
  const stepKeys = [...new Set(uses.map((use) => use.stepKey))];
  const optionalSteps = uses.filter((use) => use.optional).map((use) => use.stepKey);
  const requiredSteps = uses.filter((use) => !use.optional).map((use) => use.stepKey);
  return {
    kind,
    id: uses[0]?.id ?? 0,
    amounts: [...amounts.values()],
    optional: requiredSteps.length === 0,
    conflict: optionalSteps.length > 0 && requiredSteps.length > 0,
    optionalSteps,
    requiredSteps,
    stepKeys,
    alts: [...alts.values()],
    onlyInAlternative: stepKeys.every((key) => armSteps.has(key)),
  };
}

function group(uses: Use[]): Use[][] {
  const byId = new Map<number, Use[]>();
  for (const use of uses) {
    const list = byId.get(use.id) ?? [];
    list.push(use);
    byId.set(use.id, list);
  }
  return [...byId.values()];
}

/** The whole recipe's lists, summed from its steps in step order. */
export function summarize(draft: { nodes: DraftNode[]; edges: DraftEdge[] }): RecipeSummary {
  const ordered = [...draft.nodes].sort((left, right) => left.ord - right.ord);
  const armSteps = xorArmSteps(draft.nodes, draft.edges);
  const ingredients = ordered.flatMap((node) =>
    node.ingredients.map((item): Use => ({
      stepKey: node.key,
      id: item.ingredientId,
      qty: item.qty ?? null,
      unit: item.unit ?? null,
      optional: item.optional ?? false,
      alts: (item.alts ?? []).map((alt) => ({
        id: alt.altIngredientId,
        ratio: alt.ratio ?? 1,
        note: alt.note ?? "",
      })),
    }))
  );
  const tools = ordered.flatMap((node) =>
    node.tools.map((item): Use => ({
      stepKey: node.key,
      id: item.toolId,
      qty: null,
      unit: null,
      optional: item.optional ?? false,
      alts: (item.alts ?? []).map((alt) => ({ id: alt.altToolId, ratio: 1, note: alt.note ?? "" })),
    }))
  );
  return {
    ingredients: group(ingredients).map((uses) => line("ingredient", uses, armSteps)),
    tools: group(tools).map((uses) => {
      const result = line("tool", uses, armSteps);
      return { ...result, amounts: [] };
    }),
  };
}
