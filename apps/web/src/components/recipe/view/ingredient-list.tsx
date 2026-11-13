import { IconCarrot } from "@/components/icons";
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
  ListItemLeading,
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
 * One ingredient: carrot, name, amount and swaps as supporting text, and a trailing checkbox.
 * The label spans the icon and text, so the whole row toggles. Checked rows strike through.
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
    <ListItem class={cn("rounded-medium pr-1 state-layer", props.class)}>
      {/* `contents` keeps the input, label, and control as flex children of the row. */}
      <Checkbox class="contents" checked={props.checked} onChange={props.onChange}>
        <CheckboxInput />
        <CheckboxLabel class="-my-2 -ml-4 flex min-w-0 flex-1 cursor-pointer items-center gap-4 self-stretch py-2 pl-4">
          <ListItemLeading class="text-primary">
            <IconCarrot stroke={1.75} aria-hidden="true" />
          </ListItemLeading>
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
        <CheckboxControl class="ml-auto">
          <CheckboxIndicator />
        </CheckboxControl>
      </Checkbox>
    </ListItem>
  );
}
