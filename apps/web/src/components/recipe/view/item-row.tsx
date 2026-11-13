import {
  Checkbox,
  CheckboxControl,
  CheckboxIndicator,
  CheckboxInput,
  CheckboxLabel,
} from "@/components/m3/checkbox";
import {
  ListItem,
  ListItemContent,
  ListItemHeadline,
  ListItemLeading,
  ListItemSupportingText,
} from "@/components/m3/list";
import type { TablerIcon } from "@/components/icons";
import { formatAmount } from "@/lib/units";
import { cn } from "@/lib/utils";
import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";

/**
 * One ingredient or tool in an M3 list: amount and name, with "optional" and swaps as supporting
 * text. With `onChange` it is a checklist row: a leading checkbox whose label runs to the row's
 * right edge, so the whole row toggles, and checked rows strike through. Without it, `icon`
 * leads and the row is display only.
 */
export function ItemRow(props: {
  name: string;
  qty?: number | null;
  unit?: string | null;
  optional?: boolean;
  /** Swap names, shown as "or …". */
  alts?: string[];
  /** Leading icon for a display-only row. */
  icon?: TablerIcon;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
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
  const content = () => (
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
  );
  return (
    <Show
      when={props.onChange}
      fallback={
        // No side padding, so the icon lines up with the text around the list.
        <ListItem class={cn("px-0", props.class)}>
          <Show when={props.icon}>
            {(icon) => (
              <ListItemLeading class="text-primary">
                <Dynamic component={icon()} stroke={1.75} aria-hidden="true" />
              </ListItemLeading>
            )}
          </Show>
          {content()}
        </ListItem>
      }
    >
      {(onChange) => (
        // The control's 40px target (11px margin round the 18px box) gives the left inset: pl-1
        // puts the box 15px in, next to the 16px right padding.
        <ListItem class={cn("gap-1 rounded-medium pl-1 state-layer", props.class)}>
          {/* `contents` keeps the input, control, and label as flex children of the row. */}
          <Checkbox class="contents" checked={props.checked ?? false} onChange={onChange()}>
            <CheckboxInput />
            <CheckboxControl>
              <CheckboxIndicator />
            </CheckboxControl>
            <CheckboxLabel class="-my-2 -mr-4 flex min-w-0 flex-1 cursor-pointer items-center self-stretch py-2 pr-4">
              {content()}
            </CheckboxLabel>
          </Checkbox>
        </ListItem>
      )}
    </Show>
  );
}
