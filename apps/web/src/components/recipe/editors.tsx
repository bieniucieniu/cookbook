import { IconTrash } from "@/components/icons";
import { Button, ToggleButton } from "@/components/m3/button";
import { ButtonGroup } from "@/components/m3/button-group";
import { ChipSet, FilterChip } from "@/components/m3/chip";
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from "@/components/m3/switch";
import {
  TextField,
  TextFieldContainer,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/m3/text-field";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/popover";
import type { NodeIngredientWrite, NodeToolWrite, SpanWrite } from "@/generated/model";
import {
  durationPresets,
  formatDuration,
  unitGroupLabel,
  units,
  type UnitGroup,
} from "@/lib/units";
import { createSignal, For, type JSX } from "solid-js";
import { Dynamic } from "solid-js/web";
import { ItemChip, SpanBadge, spanIcon, spanLabel } from "./parts";

const groups: UnitGroup[] = ["mass", "volume", "count"];

function parseQty(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/** Quantity box plus unit picks grouped by kind. Picks, not typing, for the unit. */
export function QtyUnit(props: {
  qty: number | null | undefined;
  unit: string | null | undefined;
  onChange: (qty: number | null, unit: string | null) => void;
}) {
  return (
    <div class="flex flex-col gap-3">
      <TextField
        variant="outlined"
        value={props.qty == null ? "" : String(props.qty)}
        onChange={(value) => props.onChange(parseQty(value), props.unit ?? null)}
      >
        <TextFieldContainer>
          <TextFieldLabel>Amount</TextFieldLabel>
          <TextFieldInput inputMode="decimal" class="tabular-nums" />
        </TextFieldContainer>
      </TextField>
      <For each={groups}>
        {(group) => (
          <div class="flex flex-col gap-1.5">
            <span class="typescale-label-medium text-on-surface-variant">
              {unitGroupLabel[group]}
            </span>
            <ChipSet aria-label={unitGroupLabel[group]}>
              <For each={units.filter((unit) => unit.group === group)}>
                {(unit) => (
                  <FilterChip
                    pressed={props.unit === unit.value}
                    onChange={(pressed) =>
                      props.onChange(props.qty ?? null, pressed ? unit.value : null)
                    }
                  >
                    {unit.label}
                  </FilterChip>
                )}
              </For>
            </ChipSet>
          </div>
        )}
      </For>
    </div>
  );
}

function OptionalSwitch(props: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <Switch checked={props.checked} onChange={props.onChange}>
      <SwitchControl>
        <SwitchThumb />
      </SwitchControl>
      <SwitchLabel>Optional</SwitchLabel>
    </Switch>
  );
}

/** Ingredient chip that opens its own editor. */
export function IngredientEditor(props: {
  name: string;
  item: NodeIngredientWrite;
  onChange: (patch: Partial<NodeIngredientWrite>) => void;
  onRemove: () => void;
  extra?: JSX.Element;
}) {
  return (
    <Popover>
      <PopoverTrigger
        as={ItemChip}
        kind="ingredient"
        name={props.name}
        qty={props.item.qty}
        unit={props.item.unit}
        optional={props.item.optional}
        aria-label={`Edit ${props.name}`}
      />
      <PopoverPortal>
        <PopoverContent>
          <PopoverTitle>{props.name}</PopoverTitle>
          <QtyUnit
            qty={props.item.qty}
            unit={props.item.unit}
            onChange={(qty, unit) => props.onChange({ qty, unit })}
          />
          <OptionalSwitch
            checked={props.item.optional ?? false}
            onChange={(optional) => props.onChange({ optional })}
          />
          {props.extra}
          <RemoveButton onClick={props.onRemove} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

export function ToolEditor(props: {
  name: string;
  item: NodeToolWrite;
  onChange: (patch: Partial<NodeToolWrite>) => void;
  onRemove: () => void;
}) {
  return (
    <Popover>
      <PopoverTrigger
        as={ItemChip}
        kind="tool"
        name={props.name}
        optional={props.item.optional}
        aria-label={`Edit ${props.name}`}
      />
      <PopoverPortal>
        <PopoverContent>
          <PopoverTitle>{props.name}</PopoverTitle>
          <div class="flex flex-col gap-1.5">
            <span class="typescale-label-medium text-on-surface-variant">Busy</span>
            <ButtonGroup variant="connected" size="sm" aria-label="Busy">
              <ToggleButton
                variant="tonal"
                pressed={(props.item.hold ?? "active") === "active"}
                onChange={() => props.onChange({ hold: "active" })}
              >
                While hands on
              </ToggleButton>
              <ToggleButton
                variant="tonal"
                pressed={props.item.hold === "span"}
                onChange={() => props.onChange({ hold: "span" })}
              >
                Whole step
              </ToggleButton>
            </ButtonGroup>
          </div>
          <OptionalSwitch
            checked={props.item.optional ?? false}
            onChange={(optional) => props.onChange({ optional })}
          />
          <RemoveButton onClick={props.onRemove} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

function DurationPicker(props: { span: SpanWrite; onChange: (patch: Partial<SpanWrite>) => void }) {
  const [custom, setCustom] = createSignal("");
  return (
    <div class="flex flex-col gap-3">
      <ButtonGroup variant="connected" size="sm" aria-label="Kind">
        <For each={["active", "wait"] as const}>
          {(kind) => (
            <ToggleButton
              variant="tonal"
              pressed={props.span.kind === kind}
              onChange={() => props.onChange({ kind })}
            >
              <Dynamic component={spanIcon[kind]} aria-hidden="true" />
              {spanLabel[kind]}
            </ToggleButton>
          )}
        </For>
      </ButtonGroup>
      <ChipSet aria-label="Length">
        <For each={durationPresets}>
          {(seconds) => (
            <FilterChip
              class="tabular-nums"
              pressed={props.span.seconds === seconds}
              onChange={() => props.onChange({ seconds })}
            >
              {formatDuration(seconds)}
            </FilterChip>
          )}
        </For>
      </ChipSet>
      <form
        class="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const minutes = parseQty(custom());
          if (minutes) props.onChange({ seconds: Math.round(minutes * 60) });
          setCustom("");
        }}
      >
        <TextField variant="outlined" value={custom()} onChange={setCustom} class="flex-1">
          <TextFieldContainer>
            <TextFieldLabel>Minutes</TextFieldLabel>
            <TextFieldInput inputMode="decimal" class="tabular-nums" />
          </TextFieldContainer>
        </TextField>
        <Button type="submit" variant="tonal" size="md">
          Set
        </Button>
      </form>
    </div>
  );
}

export function SpanEditor(props: {
  span: SpanWrite;
  onChange: (patch: Partial<SpanWrite>) => void;
  onRemove: () => void;
  defaultOpen?: boolean;
}) {
  return (
    <Popover defaultOpen={props.defaultOpen}>
      <PopoverTrigger
        as={SpanBadge}
        kind={props.span.kind}
        seconds={props.span.seconds}
        aria-label={`Edit timer ${formatDuration(props.span.seconds)}`}
      />
      <PopoverPortal>
        <PopoverContent>
          <PopoverTitle>Timer</PopoverTitle>
          <DurationPicker span={props.span} onChange={props.onChange} />
          <RemoveButton onClick={props.onRemove} />
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

/** Removing is destructive but undoable by adding again: an error-colored text button. */
export function RemoveButton(props: { onClick: () => void; label?: string }) {
  return (
    <Button variant="text" class="w-fit text-error" onClick={() => props.onClick()}>
      <IconTrash aria-hidden="true" />
      {props.label ?? "Remove"}
    </Button>
  );
}
