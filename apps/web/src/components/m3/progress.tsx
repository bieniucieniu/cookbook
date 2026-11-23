import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
  ProgressLabel as ProgressLabelPrimitive,
  ProgressTrack as ProgressTrackPrimitive,
  ProgressValue as ProgressValuePrimitive,
} from "@ui-sdk/solid/progress";
import { type ComponentProps, Show, omit } from "solid-js";
import { partClass } from "@/lib/utils";

/** Linear progress. ui-sdk progress: `value` (null while indeterminate), `min`, `max`. */
export function Progress(props: ComponentProps<typeof ProgressPrimitive>) {
  return (
    <ProgressPrimitive
      {...props}
      class={partClass("group/progress flex w-full flex-col gap-2", props.class)}
    />
  );
}

export function ProgressLabel(props: ComponentProps<typeof ProgressLabelPrimitive>) {
  return (
    <ProgressLabelPrimitive
      {...props}
      class={partClass("typescale-title-small text-on-surface", props.class)}
    />
  );
}

export function ProgressValueLabel(props: ComponentProps<typeof ProgressValuePrimitive>) {
  return (
    <ProgressValuePrimitive
      {...props}
      class={partClass("typescale-label-large text-on-surface-variant tabular-nums", props.class)}
    />
  );
}

/**
 * The track. The indicator and the remaining track are separated by a 4px gap, and a 4px stop dot
 * marks the end.
 */
export function ProgressTrack(props: ComponentProps<typeof ProgressTrackPrimitive>) {
  return (
    <ProgressTrackPrimitive
      {...props}
      class={partClass(
        "relative flex h-1 w-full items-center gap-1 has-data-wavy:h-2.5 after:h-1 after:min-w-0 after:flex-1 after:rounded-full after:bg-secondary-container before:absolute before:right-0 before:z-10 before:size-1 before:rounded-full before:bg-primary group-data-indeterminate/progress:overflow-hidden group-data-indeterminate/progress:rounded-full group-data-indeterminate/progress:bg-secondary-container group-data-indeterminate/progress:before:hidden group-data-indeterminate/progress:after:hidden",
        props.class
      )}
    />
  );
}

/** The indicator. ui-sdk sets its width from the value. */
export function ProgressFill(
  props: ComponentProps<typeof ProgressIndicatorPrimitive> & {
    /** M3 Expressive wavy indicator. */
    wavy?: boolean;
  }
) {
  const rest = omit(props, "wavy");
  return (
    <ProgressIndicatorPrimitive
      data-wavy={props.wavy ? "" : undefined}
      {...rest}
      class={partClass(
        "h-1 shrink-0 rounded-full bg-primary motion-default data-wavy:h-2.5 data-wavy:wave-mask data-wavy:animate-m3-wave group-data-indeterminate/progress:w-1/2 group-data-indeterminate/progress:origin-left group-data-indeterminate/progress:animate-m3-linear-indeterminate",
        props.class
      )}
    />
  );
}

/** Alias for the ui-sdk part name. */
export const ProgressIndicator = ProgressFill;

function CircularIndicator(props: { size: number; thickness: number; percent: number | null }) {
  const indeterminate = () => props.percent === null;
  const radius = () => (props.size - props.thickness) / 2;
  const circumference = () => 2 * Math.PI * radius();
  const active = () => circumference() * (indeterminate() ? 0.25 : (props.percent ?? 0) / 100);
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

/** Circular progress (40px). Same props as Progress. */
export function CircularProgress(
  props: ComponentProps<typeof ProgressPrimitive> & {
    /** Diameter in px. Default 40. */
    size?: number;
    /** Stroke width in px. Default 4. */
    thickness?: number;
  }
) {
  const rest = omit(props, "size", "thickness");
  return (
    <ProgressPrimitive
      data-variant="circular"
      {...rest}
      class={partClass("group/progress inline-flex shrink-0", props.class)}
    >
      {(state) => (
        <CircularIndicator
          size={props.size ?? 40}
          thickness={props.thickness ?? 4}
          percent={state.percent}
        />
      )}
    </ProgressPrimitive>
  );
}
