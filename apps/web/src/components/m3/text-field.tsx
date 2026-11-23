import {
  Field as TextFieldPrimitive,
  FieldDescription as TextFieldDescriptionPrimitive,
  FieldError as TextFieldErrorMessagePrimitive,
  FieldLabel as TextFieldLabelPrimitive,
} from "@ui-sdk/solid/field";
import { Input as TextFieldInputPrimitive } from "@ui-sdk/solid/input";
import { Textarea as TextFieldTextAreaPrimitive } from "@ui-sdk/solid/textarea";
import { type JSX } from "@solidjs/web";
import { type ComponentProps, createContext, omit, useContext } from "solid-js";
import { cn, partClass } from "@/lib/utils";

export type TextFieldVariant = "filled" | "outlined";

const TextFieldContext = createContext<{ variant: TextFieldVariant }>({ variant: "filled" });

type TextFieldProps = ComponentProps<typeof TextFieldPrimitive> & { variant?: TextFieldVariant };
type TextFieldLabelProps = ComponentProps<typeof TextFieldLabelPrimitive>;
type TextFieldInputProps = ComponentProps<typeof TextFieldInputPrimitive>;
type TextFieldTextAreaProps = ComponentProps<typeof TextFieldTextAreaPrimitive>;
type TextFieldDescriptionProps = ComponentProps<typeof TextFieldDescriptionPrimitive>;
type TextFieldErrorMessageProps = ComponentProps<typeof TextFieldErrorMessagePrimitive>;

/**
 * Filled or outlined text field with a floating label, on ui-sdk's Field. Pass `invalid` and
 * `disabled` here; `value` / `onValueChange` go on TextFieldInput or TextFieldTextArea.
 */
export function TextField(props: TextFieldProps) {
  const rest = omit(props, "variant");
  return (
    <TextFieldContext
      value={{
        get variant() {
          return props.variant ?? "filled";
        },
      }}
    >
      <TextFieldPrimitive
        data-variant={props.variant ?? "filled"}
        {...rest}
        class={partClass(() => cn("group/text-field flex w-full flex-col"), props.class)}
      />
    </TextFieldContext>
  );
}

const containerVariantClasses = {
  filled:
    "rounded-t-extra-small bg-surface-container-highest before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-on-surface before:opacity-0 before:motion-fast hover:before:opacity-8 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-on-surface-variant after:motion-fast hover:after:bg-on-surface focus-within:after:h-0.5 focus-within:after:bg-primary group-data-invalid/text-field:after:bg-error group-data-disabled/text-field:bg-on-surface/4 group-data-disabled/text-field:before:opacity-0 group-data-disabled/text-field:after:bg-on-surface/38",
  outlined:
    "rounded-extra-small ring-1 ring-outline ring-inset motion-fast hover:ring-on-surface focus-within:ring-2 focus-within:ring-primary group-data-invalid/text-field:ring-error group-data-disabled/text-field:ring-on-surface/12",
};

/** The input box: holds the leading icon, label, input, and trailing icon. */
export function TextFieldContainer(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const context = useContext(TextFieldContext);
  return (
    <div
      data-slot="text-field-container"
      {...props}
      class={cn(
        "group/field relative flex min-h-14 w-full cursor-text items-center has-[textarea]:items-start group-data-disabled/text-field:cursor-not-allowed",
        containerVariantClasses[context.variant],
        props.class
      )}
    />
  );
}

/**
 * Floating label: sits in the box while the field is empty and unfocused, and floats (75%) once
 * the field is focused or has a value. The input needs a placeholder (TextFieldInput sets " ").
 */
const labelVariantClasses = {
  filled:
    "group-focus-within/field:-translate-y-[calc(50%+12px)] group-focus-within/field:scale-75 group-has-[:is(input,textarea):not(:placeholder-shown)]/field:-translate-y-[calc(50%+12px)] group-has-[:is(input,textarea):not(:placeholder-shown)]/field:scale-75",
  outlined:
    "-mx-1 px-1 group-focus-within/field:-translate-y-[calc(50%+28px)] group-focus-within/field:scale-75 group-focus-within/field:bg-(--text-field-notch,var(--md-sys-color-surface)) group-has-[:is(input,textarea):not(:placeholder-shown)]/field:-translate-y-[calc(50%+28px)] group-has-[:is(input,textarea):not(:placeholder-shown)]/field:scale-75 group-has-[:is(input,textarea):not(:placeholder-shown)]/field:bg-(--text-field-notch,var(--md-sys-color-surface))",
};

export function TextFieldLabel(props: TextFieldLabelProps) {
  const context = useContext(TextFieldContext);
  return (
    <TextFieldLabelPrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "pointer-events-none absolute top-1/2 left-4 z-10 max-w-[calc(100%-2rem)] origin-left -translate-y-1/2 truncate typescale-body-large text-on-surface-variant motion-fast group-focus-within/field:text-primary group-has-[textarea]/field:top-7 group-has-data-[slot=text-field-leading]/field:left-13 group-data-invalid/text-field:text-error group-data-disabled/text-field:text-on-surface/38",
            labelVariantClasses[context.variant]
          ),
        props.class
      )}
    />
  );
}

const inputVariantClasses = {
  filled: "px-4 pt-6 pb-2",
  outlined: "px-4 py-4",
};

const inputBase =
  "relative z-10 w-full min-w-0 flex-1 self-stretch bg-transparent typescale-body-large text-on-surface caret-primary outline-none placeholder:text-transparent group-focus-within/field:placeholder:text-on-surface-variant group-has-data-[slot=text-field-leading]/field:pl-0 group-has-data-[slot=text-field-trailing]/field:pr-0 group-data-invalid/text-field:caret-error disabled:cursor-not-allowed disabled:text-on-surface/38";

export function TextFieldInput(props: TextFieldInputProps) {
  const context = useContext(TextFieldContext);
  return (
    <TextFieldInputPrimitive
      placeholder=" "
      {...props}
      class={partClass(() => cn(inputBase, inputVariantClasses[context.variant]), props.class)}
    />
  );
}

export function TextFieldTextArea(props: TextFieldTextAreaProps) {
  const context = useContext(TextFieldContext);
  return (
    <TextFieldTextAreaPrimitive
      placeholder=" "
      {...props}
      class={partClass(
        () => cn(inputBase, inputVariantClasses[context.variant], "min-h-28 resize-y"),
        props.class
      )}
    />
  );
}

/** Leading icon, 24px, in on-surface-variant. */
export function TextFieldLeading(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="text-field-leading"
      {...props}
      class={cn(
        "relative z-10 flex shrink-0 items-center justify-center self-center pr-4 pl-3 text-on-surface-variant group-data-disabled/text-field:text-on-surface/38 [&_svg:not([class*='size-'])]:size-6",
        props.class
      )}
    />
  );
}

/** Trailing icon or icon button. Turns error-colored while invalid. */
export function TextFieldTrailing(props: JSX.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      data-slot="text-field-trailing"
      {...props}
      class={cn(
        "relative z-10 flex shrink-0 items-center justify-center self-center pr-3 pl-4 text-on-surface-variant group-data-invalid/text-field:text-error group-data-disabled/text-field:text-on-surface/38 [&_svg:not([class*='size-'])]:size-6",
        props.class
      )}
    />
  );
}

export function TextFieldDescription(props: TextFieldDescriptionProps) {
  return (
    <TextFieldDescriptionPrimitive
      {...props}
      class={partClass(
        () =>
          cn(
            "px-4 pt-1 typescale-body-small text-on-surface-variant group-data-disabled/text-field:text-on-surface/38"
          ),
        props.class
      )}
    />
  );
}

export function TextFieldErrorMessage(props: TextFieldErrorMessageProps) {
  return (
    <TextFieldErrorMessagePrimitive
      {...props}
      class={partClass(() => cn("px-4 pt-1 typescale-body-small text-error"), props.class)}
    />
  );
}
