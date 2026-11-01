import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type TextareaRootProps = ComponentProps<typeof TextFieldPrimitive>;
type TextareaLabelProps = ComponentProps<typeof TextFieldPrimitive.Label>;
type TextareaControlProps = ComponentProps<typeof TextFieldPrimitive.TextArea>;
type TextareaDescriptionProps = ComponentProps<typeof TextFieldPrimitive.Description>;
type TextareaErrorMessageProps = ComponentProps<typeof TextFieldPrimitive.ErrorMessage>;

const fieldClass =
  "min-h-16 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-invalid:border-destructive disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30";

function TextareaRoot(props: TextareaRootProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive
      ref={props.ref}
      class={cn("flex w-full flex-col gap-1.5 data-disabled:opacity-50", props.class)}
      {...rest}
    />
  );
}

export function TextareaLabel(props: TextareaLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.Label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium text-foreground", props.class)}
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
      class={cn("text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function TextareaErrorMessage(props: TextareaErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export const Textarea = Object.assign(TextareaRoot, {
  Label: TextareaLabel,
  TextArea: TextareaControl,
  Description: TextareaDescription,
  ErrorMessage: TextareaErrorMessage,
});
