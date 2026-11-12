import {
  IconAlertTriangle,
  IconArrowsShuffle,
  IconCarrot,
  IconClock,
  IconGitBranch,
  IconSitemap,
} from "@/components/icons";
import { Button, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import {
  Flow,
  Handle,
  Position,
  createFlow,
  type FlowEdge,
  type FlowNode,
  type NodeComponentProps,
} from "@/components/xyflow";
import { Background, Controls } from "@/components/xyflow/panels";
import "@/components/xyflow/style.css";
import type { NodeWriteBranchMode } from "@/generated/model";
import { stepSeconds, type RecipeDraft } from "@/lib/recipe-draft";
import { issueLabel, layout, type GraphIssue } from "@/lib/recipe-graph";
import { formatDuration } from "@/lib/units";
import { cn } from "@/lib/utils";
import { createContext, createEffect, createMemo, on, Show, untrack, useContext } from "solid-js";

type StepData = {
  key: string;
  title: string;
  ingredients: number;
  seconds: number;
  out: number;
  branchMode: NodeWriteBranchMode;
  issue?: GraphIssue["issue"];
};

type FlowActions = {
  editable: () => boolean;
  onBranchMode: (key: string, mode: NodeWriteBranchMode) => void;
};

const FlowActionsContext = createContext<FlowActions>({
  editable: () => false,
  onBranchMode: () => undefined,
});

function stepData(node: FlowNode): StepData {
  return node.data as StepData;
}

export function StepNode(props: NodeComponentProps) {
  const actions = useContext(FlowActionsContext);
  const data = () => stepData(props.node);
  return (
    <div
      class={cn(
        "flex w-52 flex-col gap-1.5 rounded-medium border bg-surface-container-low p-2.5 text-left text-on-surface shadow-level-1",
        props.node.selected ? "border-primary ring-2 ring-primary" : "border-outline-variant",
        data().issue && "border-error"
      )}
    >
      <Handle type="target" position={Position.Left} />
      <span class="line-clamp-2 typescale-title-small">{data().title || "Untitled step"}</span>
      <div class="flex flex-wrap items-center gap-2 typescale-label-medium text-on-surface-variant tabular-nums">
        <Show when={data().ingredients > 0}>
          <span class="inline-flex items-center gap-1">
            <IconCarrot size={14} aria-hidden="true" />
            {data().ingredients}
          </span>
        </Show>
        <Show when={data().seconds > 0}>
          <span class="inline-flex items-center gap-1">
            <IconClock size={14} aria-hidden="true" />
            {formatDuration(data().seconds)}
          </span>
        </Show>
      </div>
      <Show when={data().issue}>
        {(issue) => (
          <span class="inline-flex items-center gap-1 typescale-label-medium text-error">
            <IconAlertTriangle size={14} aria-hidden="true" />
            {issueLabel(issue())}
          </span>
        )}
      </Show>
      <Show when={data().out > 1}>
        <Show
          when={actions.editable()}
          fallback={
            <span class="inline-flex items-center gap-1 typescale-label-medium">
              {data().branchMode === "xor" ? (
                <IconArrowsShuffle size={14} aria-hidden="true" />
              ) : (
                <IconGitBranch size={14} aria-hidden="true" />
              )}
              {data().branchMode === "xor" ? "Pick one" : "Do all"}
            </span>
          }
        >
          <ButtonGroup variant="connected" size="xs" class="nodrag nopan" aria-label="Arms">
            <ToggleButton
              variant="tonal"
              aria-label="Do all arms"
              pressed={data().branchMode !== "xor"}
              onChange={() => actions.onBranchMode(data().key, "and")}
            >
              <IconGitBranch aria-hidden="true" />
              All
            </ToggleButton>
            <ToggleButton
              variant="tonal"
              aria-label="Pick one arm"
              pressed={data().branchMode === "xor"}
              onChange={() => actions.onBranchMode(data().key, "xor")}
            >
              <IconArrowsShuffle aria-hidden="true" />
              One
            </ToggleButton>
          </ButtonGroup>
        </Show>
      </Show>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function edgeId(from: string, to: string): string {
  return `${from}->${to}`;
}

/**
 * The recipe as a graph. Node positions are not stored by the API: layout runs on open and
 * drags last for the session. Editing callbacks are optional, so the same canvas is read-only
 * on the recipe page.
 */
export function RecipeFlow(props: {
  draft: Pick<RecipeDraft, "nodes" | "edges">;
  issues?: GraphIssue[];
  editable?: boolean;
  class?: string;
  onSelect?: (key: string | undefined) => void;
  onConnect?: (from: string, to: string) => void;
  onRemoveEdge?: (from: string, to: string) => void;
  onRemoveStep?: (key: string) => void;
  onBranchMode?: (key: string, mode: NodeWriteBranchMode) => void;
}) {
  const positions = new Map<string, { x: number; y: number }>();
  const nodes = createMemo<FlowNode[]>(() => {
    const auto = layout(props.draft.nodes, props.draft.edges);
    const issueByKey = new Map((props.issues ?? []).map((item) => [item.nodeKey, item.issue]));
    return props.draft.nodes.map((node) => {
      const position = untrack(() => positions.get(node.key)) ??
        auto.get(node.key) ?? { x: 0, y: 0 };
      const data: StepData = {
        key: node.key,
        title: node.title,
        ingredients: node.ingredients.length,
        seconds: stepSeconds(node),
        out: props.draft.edges.filter((edge) => edge.from === node.key).length,
        branchMode: node.branchMode,
        issue: issueByKey.get(node.key),
      };
      return {
        id: node.key,
        type: "step",
        position,
        data,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });
  });

  const edges = createMemo<FlowEdge[]>(() => {
    const modeByKey = new Map(props.draft.nodes.map((node) => [node.key, node.branchMode]));
    const outByKey = new Map<string, number>();
    for (const edge of props.draft.edges)
      outByKey.set(edge.from, (outByKey.get(edge.from) ?? 0) + 1);
    return props.draft.edges.map((edge) => {
      const alternative = (outByKey.get(edge.from) ?? 0) > 1 && modeByKey.get(edge.from) === "xor";
      return {
        id: edgeId(edge.from, edge.to),
        source: edge.from,
        target: edge.to,
        label: edge.label || undefined,
        style: alternative ? { "stroke-dasharray": "6 4" } : undefined,
      };
    });
  });

  const flow = createFlow(() => ({
    nodes: nodes(),
    edges: edges(),
    fitView: true,
    fitViewOptions: { maxZoom: 1, padding: 0.15 },
    minZoom: 0.25,
    nodesDraggable: props.editable ?? false,
    nodesConnectable: props.editable ?? false,
    elementsSelectable: true,
    nodeTypes: { step: StepNode },
    onNodesChange: (changes) => {
      for (const change of changes) {
        if (change.type === "position" && change.position)
          positions.set(change.id, change.position);
        if (change.type === "remove" && props.editable) props.onRemoveStep?.(change.id);
      }
    },
    onEdgesChange: (changes) => {
      if (!props.editable) return;
      for (const change of changes) {
        if (change.type !== "remove") continue;
        const [from, to] = change.id.split("->");
        if (from && to) props.onRemoveEdge?.(from, to);
      }
    },
    onConnect: (connection) => {
      if (connection.source && connection.target && connection.source !== connection.target) {
        props.onConnect?.(connection.source, connection.target);
      }
    },
  }));

  const selected = createMemo(() => flow.nodes.find((node) => node.selected)?.id);
  createEffect(on(selected, (key) => props.onSelect?.(key), { defer: true }));

  const tidy = () => {
    positions.clear();
    const auto = layout(props.draft.nodes, props.draft.edges);
    flow.setNodes(
      untrack(() => flow.nodes).map((node) => ({
        ...node,
        position: auto.get(node.id) ?? node.position,
      }))
    );
    void flow.fitView();
  };

  return (
    <FlowActionsContext.Provider
      value={{
        editable: () => props.editable ?? false,
        onBranchMode: (key, mode) => props.onBranchMode?.(key, mode),
      }}
    >
      <div
        class={cn(
          "relative overflow-hidden rounded-large ring-1 ring-outline-variant",
          props.class
        )}
      >
        <Flow flow={flow} class="h-full w-full">
          <Background />
          <Controls />
        </Flow>
        <Show when={props.editable}>
          <Button variant="elevated" size="sm" class="absolute top-2 right-2 z-10" onClick={tidy}>
            <IconSitemap aria-hidden="true" />
            Tidy
          </Button>
        </Show>
      </div>
    </FlowActionsContext.Provider>
  );
}
