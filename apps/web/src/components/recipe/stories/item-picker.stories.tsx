/** @jsxImportSource solid-js */
// Stories sit outside apps/web/tsconfig.json, so they use relative imports.
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createSignal } from "solid-js";
import { ItemPicker } from "../item-picker";
import { fakeCatalog } from "./fixtures";

const meta = {
  title: "Recipe/ItemPicker",
  component: ItemPicker,
} satisfies Meta<typeof ItemPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Ingredient: Story = {
  args: { kind: "ingredient", catalog: fakeCatalog(), onPick: () => undefined },
  render: (args) => {
    const [picked, setPicked] = createSignal<number[]>([2]);
    return (
      <div class="flex w-80 flex-col gap-2">
        <ItemPicker
          kind={args.kind}
          catalog={args.catalog}
          picked={picked()}
          onPick={(id) => setPicked((ids) => [...ids, id])}
        />
        <p class="text-xs text-muted-foreground">
          Picked:{" "}
          {picked()
            .map((id) => args.catalog.name(args.kind, id))
            .join(", ")}
        </p>
      </div>
    );
  },
};
