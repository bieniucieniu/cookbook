/** @jsxImportSource solid-js */
// Stories sit outside apps/web/tsconfig.json, so they use relative imports.
import type { Meta, StoryObj } from "storybook-solidjs-vite";
import { createSignal } from "solid-js";
import { QtyUnit } from "../editors";
import { ItemChip, SpanBadge, Stepper } from "../parts";

const meta = {
  title: "Recipe/Parts",
  component: ItemChip,
} satisfies Meta<typeof ItemChip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Chips: Story = {
  args: { kind: "ingredient", name: "Tomato" },
  render: () => (
    <div class="flex flex-wrap gap-2">
      <ItemChip kind="ingredient" name="Tomato" qty={400} unit="g" />
      <ItemChip kind="ingredient" name="Chili" qty={1} unit="pinch" optional />
      <ItemChip kind="ingredient" name="Egg" qty={4} unit="pcs" muted />
      <ItemChip kind="tool" name="Skillet" />
      <SpanBadge kind="active" seconds={300} />
      <SpanBadge kind="wait" seconds={1200} />
    </div>
  ),
};

export const CooksStepper: Story = {
  args: { kind: "ingredient", name: "" },
  render: () => {
    const [value, setValue] = createSignal(2);
    return <Stepper label="cooks" value={value()} onChange={setValue} />;
  },
};

export const AmountAndUnit: Story = {
  args: { kind: "ingredient", name: "" },
  render: () => {
    const [qty, setQty] = createSignal<number | null>(200);
    const [unit, setUnit] = createSignal<string | null>("g");
    return (
      <div class="w-80">
        <QtyUnit
          qty={qty()}
          unit={unit()}
          onChange={(nextQty, nextUnit) => {
            setQty(nextQty);
            setUnit(nextUnit);
          }}
        />
      </div>
    );
  },
};
