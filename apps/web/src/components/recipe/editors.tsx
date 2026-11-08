import { IconTrash } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input, InputControl, InputLabel } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverPortal,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch, SwitchControl, SwitchLabel, SwitchThumb } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { NodeIngredientWrite, NodeToolWrite, SpanWrite } from "@/generated/model";
import {
  durationPresets,
  formatDuration,
  unitGroupLabel,
  units,
  type UnitGroup,
} from "@/lib/units";
import { createSignal, For, type JSX, Show } from "solid-js";
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
      <Input
        value={props.qty == null ? "" : String(props.qty)}
        onChange={(value) => props.onChange(parseQty(value), props.unit ?? null)}
      >
        <InputLabel>Amount</InputLabel>
        <InputControl inputMode="decimal" class="h-10 text-lg font-semibold tabular-nums" />
      </Input>
      <For each={groups}>
        {(group) => (
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">{unitGroupLabel[group]}</span>
            <ToggleGroup
              variant="outline"
              size="sm"
              value={props.unit ?? null}
              onChange={(value) => props.onChange(props.qty ?? null, value)}
              class="flex-wrap"
            >
              <For each={units.filter((unit) => unit.group === group)}>
                {(unit) => <ToggleGroupItem value={unit.value}>{unit.label}</ToggleGroupItem>}
              </For>
            </ToggleGroup>
          </div>
        )}
      </For>
    </div>
  );
}

function OptionalSwitch(props: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <Switch checked={props.checked} onChange={props.onChange} class="flex items-center gap-2">
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
        <PopoverContent class="w-80">
          <PopoverTitle class="text-sm font-semibold">{props.name}</PopoverTitle>
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
          <Button type="button" variant="destructive" onClick={props.onRemove}>
            <IconTrash aria-hidden="true" />
            Remove
          </Button>
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
          <PopoverTitle class="text-sm font-semibold">{props.name}</PopoverTitle>
          <div class="flex flex-col gap-1">
            <span class="text-xs font-medium text-muted-foreground">Busy</span>
            <ToggleGroup
              variant="outline"
              value={props.item.hold ?? "active"}
              onChange={(value) => {
                if (value === "active" || value === "span") props.onChange({ hold: value });
              }}
            >
              <ToggleGroupItem value="active">While hands on</ToggleGroupItem>
              <ToggleGroupItem value="span">Whole step</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <OptionalSwitch
            checked={props.item.optional ?? false}
            onChange={(optional) => props.onChange({ optional })}
          />
          <Button type="button" variant="destructive" onClick={props.onRemove}>
            <IconTrash aria-hidden="true" />
            Remove
          </Button>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}

function DurationPicker(props: { span: SpanWrite; onChange: (patch: Partial<SpanWrite>) => void }) {
  const [custom, setCustom] = createSignal("");
  return (
    <div class="flex flex-col gap-3">
      <ToggleGroup
        variant="outline"
        value={props.span.kind}
        onChange={(value) => {
          if (value === "active" || value === "wait") props.onChange({ kind: value });
        }}
      >
        <For each={["active", "wait"] as const}>
          {(kind) => (
            <ToggleGroupItem value={kind} class="gap-1.5">
              <Dynamic component={spanIcon[kind]} size={16} aria-hidden="true" />
              {spanLabel[kind]}
            </ToggleGroupItem>
          )}
        </For>
      </ToggleGroup>
      <div class="grid grid-cols-4 gap-1">
        <For each={durationPresets}>
          {(seconds) => (
            <Button
              type="button"
              size="sm"
              variant={props.span.seconds === seconds ? "default" : "outline"}
              class="tabular-nums"
              onClick={() => props.onChange({ seconds })}
            >
              {formatDuration(seconds)}
            </Button>
          )}
        </For>
      </div>
      <form
        class="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const minutes = parseQty(custom());
          if (minutes) props.onChange({ seconds: Math.round(minutes * 60) });
          setCustom("");
        }}
      >
        <Input value={custom()} onChange={setCustom} class="flex-1">
          <InputLabel>Minutes</InputLabel>
          <InputControl inputMode="decimal" class="tabular-nums" />
        </Input>
        <Button type="submit" variant="outline">
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
        <PopoverContent class="w-80">
          <PopoverTitle class="text-sm font-semibold">Timer</PopoverTitle>
          <DurationPicker span={props.span} onChange={props.onChange} />
          <Show when={true}>
            <Button type="button" variant="destructive" onClick={props.onRemove}>
              <IconTrash aria-hidden="true" />
              Remove
            </Button>
          </Show>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
  );
}
