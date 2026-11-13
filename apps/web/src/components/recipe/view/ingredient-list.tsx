import {
  Checkbox,
  CheckboxControl,
  CheckboxIndicator,
  CheckboxInput,
  CheckboxLabel,
} from "@/components/m3/checkbox";
import {
  List,
  ListItem,
  ListItemContent,
  ListItemHeadline,
  ListItemSupportingText,
} from "@/components/m3/list";
import { formatAmount } from "@/lib/units";
import { cn } from "@/lib/utils";
import { type JSX, Show } from "solid-js";

/** M3 list of ingredients to tick off. Children are IngredientListItem rows. */
export function IngredientList(props: {
  "aria-label"?: string;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <List aria-label={props["aria-label"]} class={cn("py-0", props.class)}>
      {props.children}
    </List>
  );
}

/**
 * One ingredient: a leading checkbox, then amount and name, with swaps as supporting text. The
 * label runs from the checkbox to the row's right edge, so the whole row toggles. Checked rows
 * strike through.
 */
export function IngredientListItem(props: {
  name: string;
  qty?: number | null;
  unit?: string | null;
  optional?: boolean;
  /** Swap names, shown as "or …". */
  alts?: string[];
  checked: boolean;
  onChange: (checked: boolean) => void;
  class?: string;
}) {
  const amount = () => formatAmount(props.qty, props.unit);
  const supporting = () =>
    [
      props.optional ? "optional" : "",
      props.alts && props.alts.length > 0 ? `or ${props.alts.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
  return (
    // The control's 40px target (11px margin round the 18px box) gives the left inset: pl-1 puts
    // the box 15px in, next to the 16px right padding.
    <ListItem class={cn("gap-1 rounded-medium pl-1 state-layer", props.class)}>
      {/* `contents` keeps the input, control, and label as flex children of the row. */}
      <Checkbox class="contents" checked={props.checked} onChange={props.onChange}>
        <CheckboxInput />
        <CheckboxControl>
          <CheckboxIndicator />
        </CheckboxControl>
        <CheckboxLabel class="-my-2 -mr-4 flex min-w-0 flex-1 cursor-pointer items-center self-stretch py-2 pr-4">
          <ListItemContent>
            <ListItemHeadline class={cn(props.checked && "text-on-surface/38 line-through")}>
              <Show when={amount()}>
                <span class="font-semibold tabular-nums">{amount()} </span>
              </Show>
              {props.name}
            </ListItemHeadline>
            <Show when={supporting()}>
              <ListItemSupportingText>{supporting()}</ListItemSupportingText>
            </Show>
          </ListItemContent>
        </CheckboxLabel>
      </Checkbox>
    </ListItem>
  );
}
