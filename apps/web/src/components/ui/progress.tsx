import { Progress as ProgressPrimitive } from "@kobalte/core/progress";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type ProgressProps = ComponentProps<typeof ProgressPrimitive>;
type ProgressLabelProps = ComponentProps<typeof ProgressPrimitive.Label>;
type ProgressValueLabelProps = ComponentProps<typeof ProgressPrimitive.ValueLabel>;
type ProgressTrackProps = ComponentProps<typeof ProgressPrimitive.Track>;
type ProgressFillProps = ComponentProps<typeof ProgressPrimitive.Fill>;

export function Progress(props: ProgressProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive
      ref={props.ref}
      class={cn("flex w-full flex-col gap-2", props.class)}
      {...rest}
    />
  );
}

export function ProgressLabel(props: ProgressLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.Label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function ProgressValueLabel(props: ProgressValueLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.ValueLabel
      ref={props.ref}
      class={cn("text-xs/relaxed text-muted-foreground tabular-nums", props.class)}
      {...rest}
    />
  );
}

export function ProgressTrack(props: ProgressTrackProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.Track
      ref={props.ref}
      class={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-md bg-muted",
        props.class
      )}
      {...rest}
    />
  );
}

export function ProgressFill(props: ProgressFillProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <ProgressPrimitive.Fill
      ref={props.ref}
      class={cn(
        "h-full w-(--kb-progress-fill-width) bg-primary transition-all data-indeterminate:w-full data-indeterminate:animate-pulse",
        props.class
      )}
      {...rest}
    />
  );
}
