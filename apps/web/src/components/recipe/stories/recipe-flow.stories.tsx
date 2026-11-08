/** @jsxImportSource solid-js */
// Stories sit outside apps/web/tsconfig.json, so they use relative imports.
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { validateGraph } from "../../../lib/recipe-graph";
import { createStore } from "solid-js/store";
import { createDraftActions } from "../builder/actions";
import { StepCard } from "../builder/step-card";
import { RecipeFlow } from "../recipe-flow";
import { fakeCatalog, sampleDraft } from "./fixtures";

const meta = {
  title: "Recipe/Flow",
  component: RecipeFlow,
} satisfies Meta<typeof RecipeFlow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {
  args: { draft: sampleDraft() },
  render: (args) => <RecipeFlow draft={args.draft} class="h-[28rem]" />,
};

export const Editable: Story = {
  args: { draft: sampleDraft() },
  render: () => {
    const [draft, setDraft] = createStore(sampleDraft());
    const actions = createDraftActions(draft, setDraft);
    return (
      <RecipeFlow
        draft={draft}
        issues={validateGraph(draft.nodes, draft.edges)}
        editable
        class="h-[28rem]"
        onConnect={(from, to) => actions.addEdge(from, to)}
        onRemoveEdge={(from, to) => actions.removeEdge(from, to)}
        onRemoveStep={(key) => actions.removeStep(key)}
        onBranchMode={(key, mode) => actions.setBranchMode(key, mode)}
      />
    );
  },
};

export const Card: Story = {
  args: { draft: sampleDraft() },
  render: () => {
    const [draft, setDraft] = createStore(sampleDraft());
    const actions = createDraftActions(draft, setDraft);
    const node = draft.nodes[1];
    return node ? (
      <div class="max-w-md">
        <StepCard
          node={node}
          number={2}
          draft={draft}
          actions={actions}
          catalog={fakeCatalog()}
          first={false}
          last={false}
        />
      </div>
    ) : null;
  },
};
