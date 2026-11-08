import {
  IconCarrot,
  IconCheck,
  IconLayoutList,
  IconPhoto,
  IconSitemap,
  type TablerIcon,
} from "@/components/icons";
import type { Catalog } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { issueLabel, type GraphIssue } from "@/lib/recipe-graph";

export const stageIds = ["basics", "items", "steps", "flow", "review"] as const;
export type StageId = (typeof stageIds)[number];

export function isStage(value: unknown): value is StageId {
  return typeof value === "string" && stageIds.some((id) => id === value);
}

export const stages: { id: StageId; label: string; icon: TablerIcon }[] = [
  { id: "basics", label: "Basics", icon: IconPhoto },
  { id: "items", label: "Items", icon: IconCarrot },
  { id: "steps", label: "Steps", icon: IconLayoutList },
  { id: "flow", label: "Flow", icon: IconSitemap },
  { id: "review", label: "Review", icon: IconCheck },
];

export type Warning = {
  stage: StageId;
  text: string;
  nodeKey?: string;
  /** Blocks Save. Others are hints. */
  blocking: boolean;
};

export function draftWarnings(
  draft: RecipeDraft,
  issues: GraphIssue[],
  catalog: Catalog
): Warning[] {
  const warnings: Warning[] = [];
  if (!draft.title.trim()) warnings.push({ stage: "basics", text: "Add a name", blocking: true });
  if (draft.nodes.length === 0)
    warnings.push({ stage: "steps", text: "Add a first step", blocking: true });
  draft.nodes.forEach((node, index) => {
    if (!node.title.trim()) {
      warnings.push({
        stage: "steps",
        text: `Step ${index + 1} has no name`,
        nodeKey: node.key,
        blocking: true,
      });
    }
  });
  for (const issue of issues) {
    const node = draft.nodes.find((item) => item.key === issue.nodeKey);
    warnings.push({
      stage: "flow",
      text: `${node?.title || issue.nodeKey}: ${issueLabel(issue.issue)}`,
      nodeKey: issue.nodeKey,
      blocking: true,
    });
  }
  const usedIngredients = new Set(
    draft.nodes.flatMap((node) => node.ingredients.map((item) => item.ingredientId))
  );
  const altIngredients = new Set(draft.ingredientAlts.map((alt) => alt.altIngredientId));
  for (const id of draft.pantry.ingredients) {
    if (!usedIngredients.has(id) && !altIngredients.has(id)) {
      warnings.push({
        stage: "steps",
        text: `${catalog.name("ingredient", id)} is in no step`,
        blocking: false,
      });
    }
  }
  const usedTools = new Set(draft.nodes.flatMap((node) => node.tools.map((item) => item.toolId)));
  const altTools = new Set(draft.toolAlts.map((alt) => alt.altToolId));
  for (const id of draft.pantry.tools) {
    if (!usedTools.has(id) && !altTools.has(id)) {
      warnings.push({
        stage: "steps",
        text: `${catalog.name("tool", id)} is in no step`,
        blocking: false,
      });
    }
  }
  return warnings;
}
