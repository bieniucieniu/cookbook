import type { Catalog } from "@/lib/catalog";
import type { RecipeDraft } from "@/lib/recipe-draft";
import { issueLabel, type GraphIssue } from "@/lib/recipe-graph";
import type { RecipeSummary } from "@/lib/recipe-summary";

/** Where a fix happens: a step, or the recipe details. */
export type Target = { kind: "step"; key: string } | { kind: "details" } | { kind: "title" };

export type Warning = {
  text: string;
  target: Target;
  /** Blocks Save. Others are hints. */
  blocking: boolean;
};

export function draftWarnings(
  draft: RecipeDraft,
  issues: GraphIssue[],
  summary: RecipeSummary,
  catalog: Catalog
): Warning[] {
  const warnings: Warning[] = [];
  const title = (key: string) => {
    const index = draft.nodes.findIndex((node) => node.key === key);
    const node = draft.nodes[index];
    return node?.title.trim() ? `“${node.title.trim()}”` : `step ${index + 1}`;
  };
  if (!draft.title.trim())
    warnings.push({ text: "Add a name", target: { kind: "title" }, blocking: true });
  if (draft.nodes.length === 0)
    warnings.push({ text: "Add a first step", target: { kind: "title" }, blocking: true });
  draft.nodes.forEach((node, index) => {
    if (!node.title.trim()) {
      warnings.push({
        text: `Step ${index + 1} has no name`,
        target: { kind: "step", key: node.key },
        blocking: true,
      });
    }
  });
  for (const issue of issues) {
    warnings.push({
      text: `${title(issue.nodeKey)}: ${issueLabel(issue.issue)}`,
      target: { kind: "step", key: issue.nodeKey },
      blocking: true,
    });
  }
  for (const line of [...summary.ingredients, ...summary.tools]) {
    const loose = line.optionalSteps[0];
    const strict = line.requiredSteps[0];
    if (!line.conflict || loose === undefined || strict === undefined) continue;
    warnings.push({
      text: `${catalog.name(line.kind, line.id)} is optional in ${title(loose)} and required in ${title(strict)}`,
      target: { kind: "step", key: loose },
      blocking: true,
    });
  }
  return warnings;
}
