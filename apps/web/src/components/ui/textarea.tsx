import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<typeof TextFieldPrimitive>;
type TextareaLabelProps = ComponentProps<typeof TextFieldPrimitive.Label>;
type TextareaControlProps = ComponentProps<typeof TextFieldPrimitive.TextArea>;
type TextareaDescriptionProps = ComponentProps<typeof TextFieldPrimitive.Description>;
type TextareaErrorMessageProps = ComponentProps<typeof TextFieldPrimitive.ErrorMessage>;

const fieldClass =
  "flex field-sizing-content min-h-16 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-2 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40";

export function Textarea(props: TextareaProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive
      ref={props.ref}
      class={cn("flex w-full flex-col gap-2", props.class)}
      {...rest}
    />
  );
}

export function TextareaLabel(props: TextareaLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.Label
      ref={props.ref}
      class={cn(
        "flex items-center gap-2 text-xs/relaxed leading-none font-medium select-none data-disabled:pointer-events-none data-disabled:opacity-50",
        props.class
      )}
      {...rest}
    />
  );
}

export function TextareaControl(props: TextareaControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.TextArea ref={props.ref} class={cn(fieldClass, props.class)} {...rest} />
  );
}

export function TextareaDescription(props: TextareaDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.Description
      ref={props.ref}
      class={cn(
        "text-left text-xs/relaxed leading-normal font-normal text-muted-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export function TextareaErrorMessage(props: TextareaErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed font-normal text-destructive", props.class)}
      {...rest}
    />
  );
}
