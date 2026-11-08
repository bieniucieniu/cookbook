import {
  IconCarrot,
  IconHandStop,
  IconHourglass,
  IconMinus,
  IconPlus,
  IconToolsKitchen2,
  type TablerIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { SpanWriteKind } from "@/generated/model";
import { formatAmount, formatDuration } from "@/lib/units";
import { cn } from "@/lib/utils";
import { type JSX, Show, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";

/** Icon with a visible short label. Icons back up text and never replace it. */
export function IconLabel(props: { icon: TablerIcon; label: string; class?: string }) {
  return (
    <span class={cn("inline-flex items-center gap-1.5", props.class)}>
      <Dynamic component={props.icon} size={18} stroke={1.75} aria-hidden="true" />
      <span>{props.label}</span>
    </span>
  );
}

export function Stepper(props: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}) {
  const min = () => props.min ?? 1;
  const max = () => props.max ?? 99;
  return (
    <div class="inline-flex items-center gap-1" role="group" aria-label={props.label}>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`Fewer ${props.label}`}
        disabled={props.value <= min()}
        onClick={() => props.onChange(Math.max(min(), props.value - 1))}
      >
        <IconMinus aria-hidden="true" />
      </Button>
      <output class="min-w-12 text-center text-lg font-semibold tabular-nums" aria-live="polite">
        {props.value}
        <Show when={props.unit}>
          <span class="ml-1 text-xs font-medium text-muted-foreground">{props.unit}</span>
        </Show>
      </output>
      <Button
        type="button"
        variant="outline"
        size="icon-lg"
        aria-label={`More ${props.label}`}
        disabled={props.value >= max()}
        onClick={() => props.onChange(Math.min(max(), props.value + 1))}
      >
        <IconPlus aria-hidden="true" />
      </Button>
    </div>
  );
}

type ChipProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind: "ingredient" | "tool";
  name: string;
  qty?: number | null;
  unit?: string | null;
  optional?: boolean;
  muted?: boolean;
  /** Display only: renders a span, not a button. */
  static?: boolean;
};

/** One item with its amount. Amount is large and tabular, name is short. */
export function ItemChip(props: ChipProps) {
  const [local, rest] = splitProps(props, [
    "kind",
    "name",
    "qty",
    "unit",
    "optional",
    "muted",
    "class",
    "static",
  ]);
  const amount = () => formatAmount(local.qty, local.unit);
  return (
    <Dynamic
      component={local.static ? "span" : "button"}
      type={local.static ? undefined : "button"}
      class={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        !local.static && "hover:bg-muted",
        local.optional && "border-dashed",
        local.muted && "opacity-50 line-through",
        local.class
      )}
      {...rest}
    >
      <Dynamic
        component={local.kind === "ingredient" ? IconCarrot : IconToolsKitchen2}
        size={16}
        stroke={1.75}
        aria-hidden="true"
        class="text-muted-foreground"
      />
      <Show when={amount()}>
        <span class="font-semibold tabular-nums">{amount()}</span>
      </Show>
      <span>{local.name}</span>
      <Show when={local.optional}>
        <span class="text-xs text-muted-foreground">optional</span>
      </Show>
    </Dynamic>
  );
}

export const spanIcon: Record<SpanWriteKind, TablerIcon> = {
  active: IconHandStop,
  wait: IconHourglass,
};

export const spanLabel: Record<SpanWriteKind, string> = {
  active: "Hands on",
  wait: "Wait",
};

/** Active and wait differ by icon and border style, not by colour alone. */
export function SpanBadge(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    kind: SpanWriteKind;
    seconds: number;
    static?: boolean;
  }
) {
  const [local, rest] = splitProps(props, ["kind", "seconds", "class", "static"]);
  return (
    <Dynamic
      component={local.static ? "span" : "button"}
      type={local.static ? undefined : "button"}
      class={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
        !local.static && "hover:bg-muted",
        local.kind === "wait" ? "border-dashed border-border" : "border-foreground/30 bg-muted/50",
        local.class
      )}
      {...rest}
    >
      <Dynamic component={spanIcon[local.kind]} size={16} stroke={1.75} aria-hidden="true" />
      <span class="font-semibold">{formatDuration(local.seconds)}</span>
      <span class="text-xs text-muted-foreground">{spanLabel[local.kind]}</span>
    </Dynamic>
  );
}
