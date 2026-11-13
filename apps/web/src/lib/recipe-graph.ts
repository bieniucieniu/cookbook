import type { NodeWriteBranchMode, NodeWriteJoinMode } from "@/generated/model";

export type GraphNode = { key: string; ord: number; branchMode: NodeWriteBranchMode };
export type GraphEdge = { from: string; to: string };

export type GraphIssue = {
  nodeKey: string;
  issue: "cycle" | "open-split" | "join-without-split";
};

const issueText: Record<GraphIssue["issue"], string> = {
  cycle: "Loops back",
  "open-split": "Arms never meet",
  "join-without-split": "No matching split",
};

export function issueLabel(issue: GraphIssue["issue"]): string {
  return issueText[issue];
}

function adjacency(keys: string[], edges: GraphEdge[]) {
  const known = new Set(keys);
  const next = new Map<string, string[]>(keys.map((key) => [key, []]));
  const prev = new Map<string, string[]>(keys.map((key) => [key, []]));
  for (const edge of edges) {
    if (!known.has(edge.from) || !known.has(edge.to) || edge.from === edge.to) continue;
    next.get(edge.from)?.push(edge.to);
    prev.get(edge.to)?.push(edge.from);
  }
  return { next, prev };
}

/** Longest-path depth from the roots. Nodes on a cycle get no rank and land after the rest. */
export function ranks(
  keys: string[],
  edges: GraphEdge[]
): { rank: Map<string, number>; cyclic: Set<string> } {
  const { next, prev } = adjacency(keys, edges);
  const indegree = new Map(keys.map((key) => [key, prev.get(key)?.length ?? 0]));
  const rank = new Map<string, number>();
  const queue = keys.filter((key) => indegree.get(key) === 0);
  for (const key of queue) rank.set(key, 0);
  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    if (key === undefined) continue;
    for (const target of next.get(key) ?? []) {
      rank.set(target, Math.max(rank.get(target) ?? 0, (rank.get(key) ?? 0) + 1));
      const left = (indegree.get(target) ?? 1) - 1;
      indegree.set(target, left);
      if (left === 0) queue.push(target);
    }
  }
  const cyclic = new Set(keys.filter((key) => (indegree.get(key) ?? 0) > 0));
  const deepest = Math.max(-1, ...rank.values());
  for (const key of cyclic) rank.set(key, deepest + 1);
  return { rank, cyclic };
}

/** Step numbers as the list, graph, and editor show them: lane by lane, in `ord` order. */
export function stepNumbers(
  nodes: { key: string; ord: number }[],
  edges: GraphEdge[]
): Map<string, number> {
  const result = new Map<string, number>();
  let next = 1;
  for (const row of lanes(nodes, edges)) for (const node of row) result.set(node.key, next++);
  return result;
}

/** Steps grouped by depth, each group in `ord` order. Same group = may run side by side. */
export function lanes<T extends { key: string; ord: number }>(
  nodes: T[],
  edges: GraphEdge[]
): T[][] {
  const { rank } = ranks(
    nodes.map((node) => node.key),
    edges
  );
  const groups = new Map<number, T[]>();
  for (const node of [...nodes].sort((left, right) => left.ord - right.ord)) {
    const depth = rank.get(node.key) ?? 0;
    const group = groups.get(depth) ?? [];
    group.push(node);
    groups.set(depth, group);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right).map(([, group]) => group);
}

export type RowMode = "and" | "xor";

/**
 * How the steps of one lane relate: "xor" (pick one) when the step they branch from picks one
 * arm, else "and" (do them at the same time).
 */
export function rowMode(
  row: { key: string }[],
  nodes: { key: string; branchMode: NodeWriteBranchMode }[],
  edges: GraphEdge[]
): RowMode {
  const parent = edges.find((edge) => edge.to === row[0]?.key)?.from;
  return nodes.find((node) => node.key === parent)?.branchMode === "xor" ? "xor" : "and";
}

function ancestors(key: string, prev: Map<string, string[]>): Set<string> {
  const seen = new Set<string>([key]);
  const stack = [key];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    for (const parent of prev.get(current) ?? []) {
      if (seen.has(parent)) continue;
      seen.add(parent);
      stack.push(parent);
    }
  }
  return seen;
}

/** The deepest split that every arm entering `joinKey` comes from. */
function splitFor(
  joinKey: string,
  next: Map<string, string[]>,
  prev: Map<string, string[]>,
  rank: Map<string, number>
): string | undefined {
  const parents = prev.get(joinKey) ?? [];
  if (parents.length < 2) return undefined;
  const [first, ...rest] = parents.map((parent) => ancestors(parent, prev));
  if (!first) return undefined;
  const common = [...first].filter(
    (key) => rest.every((set) => set.has(key)) && (next.get(key)?.length ?? 0) > 1
  );
  common.sort((left, right) => (rank.get(right) ?? 0) - (rank.get(left) ?? 0));
  return common[0];
}

/**
 * Modes follow degree (docs/recipes.md): out-degree > 1 is a split, in-degree > 1 is a join.
 * The cook only picks `and` / `xor` on a split. Its join takes the same mode.
 */
export function deriveModes(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { branchMode: NodeWriteBranchMode; joinMode: NodeWriteJoinMode }> {
  const keys = nodes.map((node) => node.key);
  const { next, prev } = adjacency(keys, edges);
  const { rank } = ranks(keys, edges);
  const chosen = new Map(nodes.map((node) => [node.key, node.branchMode]));
  const modes = new Map<string, { branchMode: NodeWriteBranchMode; joinMode: NodeWriteJoinMode }>();
  for (const key of keys) {
    const out = next.get(key)?.length ?? 0;
    const picked = chosen.get(key);
    const branchMode: NodeWriteBranchMode = out > 1 ? (picked === "xor" ? "xor" : "and") : "none";
    modes.set(key, { branchMode, joinMode: "none" });
  }
  for (const key of keys) {
    if ((prev.get(key)?.length ?? 0) < 2) continue;
    const split = splitFor(key, next, prev, rank);
    const mode = split ? (modes.get(split)?.branchMode ?? "and") : "and";
    const current = modes.get(key);
    if (current) current.joinMode = mode === "none" ? "and" : mode;
  }
  return modes;
}

export function validateGraph(nodes: GraphNode[], edges: GraphEdge[]): GraphIssue[] {
  const keys = nodes.map((node) => node.key);
  const { next, prev } = adjacency(keys, edges);
  const { rank, cyclic } = ranks(keys, edges);
  const issues: GraphIssue[] = [...cyclic].map((nodeKey) => ({ nodeKey, issue: "cycle" }));
  if (cyclic.size > 0) return issues;
  const closed = new Set<string>();
  for (const key of keys) {
    if ((prev.get(key)?.length ?? 0) < 2) continue;
    const split = splitFor(key, next, prev, rank);
    if (split) closed.add(split);
    else issues.push({ nodeKey: key, issue: "join-without-split" });
  }
  for (const key of keys) {
    if ((next.get(key)?.length ?? 0) > 1 && !closed.has(key)) {
      issues.push({ nodeKey: key, issue: "open-split" });
    }
  }
  return issues;
}

export function leaves(keys: string[], edges: GraphEdge[]): string[] {
  const { next } = adjacency(keys, edges);
  return keys.filter((key) => (next.get(key)?.length ?? 0) === 0);
}

/** Edges for a new step: from every current leaf, so open arms join here. */
export function autoWire(keys: string[], edges: GraphEdge[], newKey: string): GraphEdge[] {
  return leaves(
    keys.filter((key) => key !== newKey),
    edges
  ).map((from) => ({ from, to: newKey }));
}

export function outgoing(key: string, edges: GraphEdge[]): string[] {
  return edges.filter((edge) => edge.from === key).map((edge) => edge.to);
}

export function incoming(key: string, edges: GraphEdge[]): string[] {
  return edges.filter((edge) => edge.to === key).map((edge) => edge.from);
}

function descendants(key: string, next: Map<string, string[]>): Set<string> {
  return ancestors(key, next);
}

/** Steps inside an `xor` arm: only some walks run them. */
export function xorArmSteps(nodes: GraphNode[], edges: GraphEdge[]): Set<string> {
  const keys = nodes.map((node) => node.key);
  const { next, prev } = adjacency(keys, edges);
  const { rank, cyclic } = ranks(keys, edges);
  const result = new Set<string>();
  if (cyclic.size > 0) return result;
  const modes = deriveModes(nodes, edges);
  for (const join of keys) {
    if ((prev.get(join)?.length ?? 0) < 2) continue;
    const split = splitFor(join, next, prev, rank);
    if (!split || modes.get(split)?.branchMode !== "xor") continue;
    const below = descendants(split, next);
    for (const key of ancestors(join, prev)) {
      if (key !== split && key !== join && below.has(key)) result.add(key);
    }
  }
  return result;
}

/** Where a step sits, relative to another step. */
export type Relation = "next" | "alt" | "parallel";

export const relationLabel: Record<Relation, string> = {
  next: "Next after",
  alt: "Or instead of",
  parallel: "Alongside",
};

export const relationMode: Record<Exclude<Relation, "next">, NodeWriteBranchMode> = {
  alt: "xor",
  parallel: "and",
};

/** The step a split's arms meet at, if they already meet. */
function joinOf(split: string, keys: string[], edges: GraphEdge[]): string | undefined {
  const { next, prev } = adjacency(keys, edges);
  const { rank } = ranks(keys, edges);
  return keys.find(
    (key) => (prev.get(key)?.length ?? 0) > 1 && splitFor(key, next, prev, rank) === split
  );
}

export type PlacementCheck = { ok: true } | { ok: false; reason: string };

/**
 * Whether a new step can go `relation` to `anchor`. `next` always fits. `alt` and `parallel` add
 * an arm next to the anchor, so they need one step before it whose split (if any) has the same
 * mode, and must not land inside another region's join.
 */
export function placement(
  anchor: string,
  relation: Relation,
  nodes: GraphNode[],
  edges: GraphEdge[]
): PlacementCheck {
  if (relation === "next") return { ok: true };
  const keys = nodes.map((node) => node.key);
  const before = incoming(anchor, edges);
  if (before.length === 0) return { ok: false, reason: "Add a step before it first" };
  if (before.length > 1)
    return { ok: false, reason: "Arms meet at this step. Pick a step in one arm" };
  if (outgoing(anchor, edges).length > 1)
    return { ok: false, reason: "This step splits. Pick a step in one of its arms" };
  const parent = before[0];
  if (parent === undefined) return { ok: false, reason: "Add a step before it first" };
  const mode = relationMode[relation];
  if (outgoing(parent, edges).length > 1) {
    const current = deriveModes(nodes, edges).get(parent)?.branchMode;
    if (current !== mode) {
      return {
        ok: false,
        reason:
          current === "xor"
            ? "It is already a choice. Use Or, or add a step before it"
            : "It already runs alongside another step. Use Alongside, or add a step before it",
      };
    }
    return { ok: true };
  }
  const after = outgoing(anchor, edges)[0];
  if (after !== undefined && incoming(after, edges).length > 1 && !joinOf(parent, keys, edges)) {
    return { ok: false, reason: "The next step joins other arms. Add a step after this one first" };
  }
  return { ok: true };
}

/** Edges without `key`. A chain closes over the gap; an arm just goes away. */
export function detachEdges(key: string, edges: GraphEdge[]): GraphEdge[] {
  const before = incoming(key, edges);
  const after = outgoing(key, edges);
  const rest = edges.filter((edge) => edge.from !== key && edge.to !== key);
  for (const from of before) {
    if (outgoing(from, rest).length > 0) continue;
    for (const to of after) {
      if (!rest.some((edge) => edge.from === from && edge.to === to)) rest.push({ from, to });
    }
  }
  return rest;
}

/**
 * Edges that put a detached `key` at `relation` to `anchor`, plus split modes to set. With no
 * anchor the step goes after every open arm, so a linear recipe never needs the graph.
 */
export function attachEdges(
  key: string,
  relation: Relation,
  anchor: string | undefined,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { edges: GraphEdge[]; modes: Map<string, NodeWriteBranchMode> } {
  const keys = nodes.map((node) => node.key);
  const modes = new Map<string, NodeWriteBranchMode>();
  const result = edges.filter((edge) => edge.from !== key && edge.to !== key);
  const add = (from: string, to: string) => {
    if (from !== to && !result.some((edge) => edge.from === from && edge.to === to)) {
      result.push({ from, to });
    }
  };
  if (anchor === undefined) {
    for (const wire of autoWire(keys, result, key)) add(wire.from, wire.to);
    return { edges: result, modes };
  }
  if (relation === "next") {
    const after = outgoing(anchor, result);
    const kept = result.filter((edge) => edge.from !== anchor);
    result.length = 0;
    result.push(...kept);
    add(anchor, key);
    for (const to of after) add(key, to);
    if (after.length > 1) {
      // The new step takes over the split.
      modes.set(key, nodes.find((node) => node.key === anchor)?.branchMode ?? "and");
    }
    return { edges: result, modes };
  }
  const parent = incoming(anchor, result)[0];
  if (parent === undefined) return { edges: result, modes };
  const join =
    outgoing(parent, result).length > 1
      ? joinOf(parent, keys, result)
      : outgoing(anchor, result)[0];
  add(parent, key);
  if (join !== undefined) add(key, join);
  modes.set(parent, relationMode[relation]);
  return { edges: result, modes };
}

/** How `key` sits now, for the placement picker. */
export function currentPlacement(
  key: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { relation: Relation; anchor: string | undefined } {
  const parent = incoming(key, edges);
  const first = parent[0];
  if (parent.length === 1 && first !== undefined) {
    const siblings = outgoing(first, edges).filter((other) => other !== key);
    const sibling = siblings[0];
    if (sibling !== undefined) {
      const mode = deriveModes(nodes, edges).get(first)?.branchMode;
      return { relation: mode === "xor" ? "alt" : "parallel", anchor: sibling };
    }
  }
  return { relation: "next", anchor: first };
}
