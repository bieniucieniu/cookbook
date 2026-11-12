import {
  IconCarrot,
  IconHandStop,
  IconHourglass,
  IconMinus,
  IconPlus,
  IconToolsKitchen2,
  type TablerIcon,
} from "@/components/icons";
import { IconButton } from "@/components/m3/icon-button";
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
      <IconButton
        variant="outlined"
        aria-label={`Fewer ${props.label}`}
        disabled={props.value <= min()}
        onClick={() => props.onChange(Math.max(min(), props.value - 1))}
      >
        <IconMinus aria-hidden="true" />
      </IconButton>
      <output
        class="min-w-12 text-center typescale-title-large text-on-surface tabular-nums"
        aria-live="polite"
      >
        {props.value}
        <Show when={props.unit}>
          <span class="ml-1 typescale-label-small text-on-surface-variant">{props.unit}</span>
        </Show>
      </output>
      <IconButton
        variant="outlined"
        aria-label={`More ${props.label}`}
        disabled={props.value >= max()}
        onClick={() => props.onChange(Math.min(max(), props.value + 1))}
      >
        <IconPlus aria-hidden="true" />
      </IconButton>
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
  /** `lg` is the cook-mode row: taller, with body-large text. */
  size?: "md" | "lg";
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
    "size",
  ]);
  const amount = () => formatAmount(local.qty, local.unit);
  return (
    <Dynamic
      component={local.static ? "span" : "button"}
      type={local.static ? undefined : "button"}
      class={cn(
        "relative inline-flex items-center gap-2 border border-outline-variant bg-surface-container-low py-1 text-on-surface",
        local.size === "lg"
          ? "min-h-14 rounded-large px-4 typescale-body-large"
          : "min-h-9 rounded-small px-3 typescale-label-large",
        !local.static && "cursor-pointer state-layer focus-ring motion-fast",
        local.optional && "border-dashed",
        local.muted && "text-on-surface/38 line-through",
        local.class
      )}
      {...rest}
    >
      <Dynamic
        component={local.kind === "ingredient" ? IconCarrot : IconToolsKitchen2}
        size={16}
        stroke={1.75}
        aria-hidden="true"
        class="text-primary"
      />
      <Show when={amount()}>
        <span class="font-semibold tabular-nums">{amount()}</span>
      </Show>
      <span>{local.name}</span>
      <Show when={local.optional}>
        <span class="typescale-label-small text-on-surface-variant">optional</span>
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
        "relative inline-flex min-h-9 items-center gap-1.5 rounded-small border px-2.5 py-1 typescale-label-large text-on-surface tabular-nums",
        !local.static && "cursor-pointer state-layer focus-ring motion-fast",
        local.kind === "wait"
          ? "border-dashed border-outline"
          : "border-transparent bg-secondary-container text-on-secondary-container",
        local.class
      )}
      {...rest}
    >
      <Dynamic component={spanIcon[local.kind]} size={16} stroke={1.75} aria-hidden="true" />
      <span class="font-semibold">{formatDuration(local.seconds)}</span>
      <span class="typescale-label-small opacity-80">{spanLabel[local.kind]}</span>
    </Dynamic>
  );
}
