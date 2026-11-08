import { type JSX, splitProps } from "solid-js";
import { cn } from "@/lib/utils";

const alertVariantClasses = {
  default: "bg-card text-card-foreground",
  destructive:
    "bg-card text-destructive *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current",
};

type AlertProps = JSX.HTMLAttributes<HTMLDivElement> & {
  variant?: keyof typeof alertVariantClasses;
};

export function Alert(props: AlertProps) {
  const [, rest] = splitProps(props, ["class", "ref", "variant"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert"
      role="alert"
      class={cn(
        "group/alert relative grid w-full gap-0.5 rounded-lg border px-2 py-1.5 text-left text-xs/relaxed has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-1.5 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-3.5",
        alertVariantClasses[props.variant ?? "default"],
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertTitle(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert-title"
      class={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertDescription(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert-description"
      class={cn(
        "text-xs/relaxed text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        props.class
      )}
      {...rest}
    />
  );
}

export function AlertAction(props: JSX.HTMLAttributes<HTMLDivElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div
      ref={props.ref}
      data-slot="alert-action"
      class={cn("absolute top-1.5 right-2", props.class)}
      {...rest}
    />
  );
}
