import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type InputRootProps = ComponentProps<typeof TextFieldPrimitive>;
type InputLabelProps = ComponentProps<typeof TextFieldPrimitive.Label>;
type InputControlProps = ComponentProps<typeof TextFieldPrimitive.Input>;
type InputDescriptionProps = ComponentProps<typeof TextFieldPrimitive.Description>;
type InputErrorMessageProps = ComponentProps<typeof TextFieldPrimitive.ErrorMessage>;

const fieldClass =
  "h-7 w-full rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-invalid:border-destructive disabled:opacity-50 md:text-xs/relaxed dark:bg-input/30";

function InputRoot(props: InputRootProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive
      ref={props.ref}
      class={cn("flex w-full flex-col gap-1.5 data-disabled:opacity-50", props.class)}
      {...rest}
    />
  );
}

export function InputLabel(props: InputLabelProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.Label
      ref={props.ref}
      class={cn("text-xs/relaxed font-medium text-foreground", props.class)}
      {...rest}
    />
  );
}

export function InputControl(props: InputControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <TextFieldPrimitive.Input ref={props.ref} class={cn(fieldClass, props.class)} {...rest} />;
}

export function InputDescription(props: InputDescriptionProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.Description
      ref={props.ref}
      class={cn("text-xs/relaxed text-muted-foreground", props.class)}
      {...rest}
    />
  );
}

export function InputErrorMessage(props: InputErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed text-destructive", props.class)}
      {...rest}
    />
  );
}

export const Input = Object.assign(InputRoot, {
  Label: InputLabel,
  Input: InputControl,
  Description: InputDescription,
  ErrorMessage: InputErrorMessage,
});
