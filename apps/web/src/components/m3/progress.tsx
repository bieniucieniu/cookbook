import { Progress as ProgressPrimitive, useProgressContext } from "@kobalte/core/progress";
import { type ComponentProps, Show, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type ProgressProps = ComponentProps<typeof ProgressPrimitive>;
type ProgressLabelProps = ComponentProps<typeof ProgressPrimitive.Label>;
type ProgressValueLabelProps = ComponentProps<typeof ProgressPrimitive.ValueLabel>;
type ProgressTrackProps = ComponentProps<typeof ProgressPrimitive.Track>;
type ProgressFillProps = ComponentProps<typeof ProgressPrimitive.Fill> & {
  /** M3 Expressive wavy indicator. */
  wavy?: boolean;
};

/** Linear progress. Kobalte progress: `value`, `minValue`, `maxValue`, `indeterminate`. */
export function Progress(props: ProgressProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive
      ref={props.ref}
      data-slot="progress"
      class={cn("group/progress flex w-full flex-col gap-2", props.class)}
      {...rest}
    />
  );
}

export function ProgressLabel(props: ProgressLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.Label
      ref={props.ref}
      data-slot="progress-label"
      class={cn("typescale-title-small text-on-surface", props.class)}
      {...rest}
    />
  );
}

export function ProgressValueLabel(props: ProgressValueLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.ValueLabel
      ref={props.ref}
      data-slot="progress-value-label"
      class={cn("typescale-label-large text-on-surface-variant tabular-nums", props.class)}
      {...rest}
    />
  );
}

/**
 * The track. The indicator and the remaining track are separated by a 4px gap, and a 4px stop dot
 * marks the end.
 */
export function ProgressTrack(props: ProgressTrackProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.Track
      ref={props.ref}
      data-slot="progress-track"
      class={cn(
        "relative flex h-1 w-full items-center gap-1 has-data-wavy:h-2.5 after:h-1 after:min-w-0 after:flex-1 after:rounded-full after:bg-secondary-container before:absolute before:right-0 before:z-10 before:size-1 before:rounded-full before:bg-primary group-data-indeterminate/progress:overflow-hidden group-data-indeterminate/progress:rounded-full group-data-indeterminate/progress:bg-secondary-container group-data-indeterminate/progress:before:hidden group-data-indeterminate/progress:after:hidden",
        props.class
      )}
      {...rest}
    />
  );
}

export function ProgressFill(props: ProgressFillProps) {
  const [, rest] = splitProps(props, ["class", "ref", "wavy"]);
  return (
    <ProgressPrimitive.Fill
      ref={props.ref}
      data-slot="progress-fill"
      data-wavy={props.wavy ? "" : undefined}
      class={cn(
        "h-1 w-(--kb-progress-fill-width) shrink-0 rounded-full bg-primary motion-default data-wavy:h-2.5 data-wavy:wave-mask data-wavy:animate-m3-wave group-data-indeterminate/progress:w-1/2 group-data-indeterminate/progress:origin-left group-data-indeterminate/progress:animate-m3-linear-indeterminate",
        props.class
      )}
      {...rest}
    />
  );
}

type CircularProgressProps = ProgressProps & {
  /** Diameter in px. Default 40. */
  size?: number;
  /** Stroke width in px. Default 4. */
  thickness?: number;
};

function CircularIndicator(props: { size: number; thickness: number }) {
  const progress = useProgressContext();
  const indeterminate = () => progress.dataset()["data-indeterminate"] !== undefined;
  const radius = () => (props.size - props.thickness) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const active = () => circumference() * (indeterminate() ? 0.25 : progress.valuePercent());
  // Gap between indicator and track, plus room for the round caps.
  const gap = () => (active() > 0 && active() < circumference() ? 4 + props.thickness : 0);
  const track = () => Math.max(0, circumference() - active() - gap() * 2);
  return (
    <svg
      viewBox={`0 0 ${props.size} ${props.size}`}
      width={props.size}
      height={props.size}
      aria-hidden="true"
      class="-rotate-90 group-data-indeterminate/progress:animate-m3-spin"
      fill="none"
      stroke-width={props.thickness}
      stroke-linecap="round"
    >
      <Show when={!indeterminate()}>
        <circle
          cx={props.size / 2}
          cy={props.size / 2}
          r={radius()}
          class="stroke-secondary-container motion-default"
          stroke-dasharray={`${track()} ${circumference()}`}
          stroke-dashoffset={-(active() + gap())}
        />
      </Show>
      <circle
        cx={props.size / 2}
        cy={props.size / 2}
        r={radius()}
        class="stroke-primary motion-default group-data-indeterminate/progress:animate-m3-circular-indeterminate"
        stroke-dasharray={`${active()} ${circumference()}`}
      />
    </svg>
  );
}

/** Circular progress (40px). Same Kobalte props as Progress. */
export function CircularProgress(props: CircularProgressProps) {
  const [, rest] = splitProps(props, ["class", "ref", "size", "thickness"]);
  return (
    <ProgressPrimitive
      ref={props.ref}
      data-slot="circular-progress"
      class={cn("group/progress inline-flex shrink-0", props.class)}
      {...rest}
    >
      <CircularIndicator size={props.size ?? 40} thickness={props.thickness ?? 4} />
    </ProgressPrimitive>
  );
}
