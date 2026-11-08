import { Switch as SwitchPrimitive } from "@kobalte/core/switch";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type SwitchProps = ComponentProps<typeof SwitchPrimitive> & { size?: "sm" | "default" };
type SwitchControlProps = ComponentProps<typeof SwitchPrimitive.Control>;
type SwitchThumbProps = ComponentProps<typeof SwitchPrimitive.Thumb>;
type SwitchLabelProps = ComponentProps<typeof SwitchPrimitive.Label>;
type SwitchDescriptionProps = ComponentProps<typeof SwitchPrimitive.Description>;
type SwitchErrorMessageProps = ComponentProps<typeof SwitchPrimitive.ErrorMessage>;

export function Switch(props: SwitchProps) {
  const [, rest] = splitProps(props, ["class", "ref", "size"]);
  return (
    <SwitchPrimitive
      ref={props.ref}
      data-size={props.size ?? "default"}
      class={cn(
        "group/switch inline-flex items-center gap-2 text-xs/relaxed text-foreground data-disabled:cursor-not-allowed data-disabled:opacity-50",
        props.class
      )}
      {...rest}
    />
  );
}

export function SwitchControl(props: SwitchControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Control
      ref={props.ref}
      class={cn(
        "relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none peer-focus-visible:border-ring peer-focus-visible:ring-2 peer-focus-visible:ring-ring/30 group-data-[size=default]/switch:h-[16.6px] group-data-[size=default]/switch:w-[28px] group-data-[size=sm]/switch:h-[14px] group-data-[size=sm]/switch:w-[24px] data-checked:bg-primary data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/20 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40 not-data-checked:bg-input dark:not-data-checked:bg-input/80",
        props.class
      )}
      {...rest}
    />
  );
}

export function SwitchThumb(props: SwitchThumbProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Thumb
      ref={props.ref}
      class={cn(
        "pointer-events-none block translate-x-0 rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-3 data-checked:translate-x-[calc(100%-2px)] dark:not-data-checked:bg-foreground dark:data-checked:bg-primary-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export function SwitchLabel(props: SwitchLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function SwitchDescription(props: SwitchDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.Description
      ref={props.ref}
      class={cn("text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function SwitchErrorMessage(props: SwitchErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <SwitchPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export function SwitchInput(props: ComponentProps<typeof SwitchPrimitive.Input>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <SwitchPrimitive.Input ref={props.ref} class={cn("peer", props.class)} {...rest} />;
}
