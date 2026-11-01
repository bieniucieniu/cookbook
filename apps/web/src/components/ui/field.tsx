import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

function FieldRoot(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <div ref={props.ref} class={cn("flex flex-col gap-2", props.class)} {...rest} />;
}

export function FieldLabel(props: JSX.LabelHTMLAttributes<HTMLLabelElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium leading-snug text-foreground", props.class)}
      {...rest}
    />
  );
}

export function FieldDescription(props: JSX.HTMLAttributes<HTMLParagraphElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <p
      ref={props.ref}
      class={cn("text-left text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function FieldError(props: JSX.HTMLAttributes<HTMLParagraphElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <p
      ref={props.ref}
      role="alert"
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export const Field = Object.assign(FieldRoot, {
  Label: FieldLabel,
  Description: FieldDescription,
  Error: FieldError,
});
