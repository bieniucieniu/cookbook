import { TextField as TextFieldPrimitive } from "@kobalte/core/text-field";
import { type ComponentProps, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

type InputProps = ComponentProps<typeof TextFieldPrimitive>;
type InputLabelProps = ComponentProps<typeof TextFieldPrimitive.Label>;
type InputControlProps = ComponentProps<typeof TextFieldPrimitive.Input>;
type InputDescriptionProps = ComponentProps<typeof TextFieldPrimitive.Description>;
type InputErrorMessageProps = ComponentProps<typeof TextFieldPrimitive.ErrorMessage>;

const fieldClass =
  "h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-destructive data-invalid:ring-2 data-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:data-invalid:border-destructive/50 dark:data-invalid:ring-destructive/40";

export function Input(props: InputProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive
      ref={props.ref}
      class={cn("flex w-full flex-col gap-2", props.class)}
      {...rest}
    />
  );
}

export function InputLabel(props: InputLabelProps) {
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

export function InputControl(props: InputControlProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <TextFieldPrimitive.Input ref={props.ref} class={cn(fieldClass, props.class)} {...rest} />;
}

export function InputDescription(props: InputDescriptionProps) {
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

export function InputErrorMessage(props: InputErrorMessageProps) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <TextFieldPrimitive.ErrorMessage
      ref={props.ref}
      class={cn("text-xs/relaxed font-normal text-destructive", props.class)}
      {...rest}
    />
  );
}
