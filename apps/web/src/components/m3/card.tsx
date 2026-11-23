import { type JSX } from "@solidjs/web";
import { omit } from "solid-js";
import { cn } from "@/lib/utils";

const cardVariantClasses = {
  elevated: "bg-surface-container-low shadow-level-1",
  filled: "bg-surface-container-highest",
  outlined: "border border-outline-variant bg-surface",
};

export type CardVariant = keyof typeof cardVariantClasses;

export interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Adds a state layer, raised hover elevation, and focus ring for a card that acts as a link. */
  interactive?: boolean;
}

export function Card(props: CardProps) {
  const rest = omit(props, "variant", "interactive");
  return (
    <div
      data-slot="card"
      data-variant={props.variant ?? "elevated"}
      {...rest}
      class={cn(
        "group/card relative flex flex-col gap-4 overflow-hidden rounded-medium py-4 text-on-surface has-[>[data-slot=card-media]:first-child]:pt-0",
        cardVariantClasses[props.variant ?? "elevated"],
        props.interactive &&
          "cursor-pointer state-layer focus-ring motion-fast [--state-layer-color:var(--md-sys-color-on-surface)] hover:shadow-level-2 data-[variant=filled]:hover:shadow-level-1 data-[variant=outlined]:hover:shadow-level-1",
        props.class
      )}
    />
  );
}

/** Full-bleed image or video. Put it first to sit flush with the top corners. */
export function CardMedia(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-media"
      {...props}
      class={cn("overflow-hidden [&>img]:w-full [&>img]:object-cover", props.class)}
    />
  );
}

export function CardHeader(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-header"
      {...props}
      class={cn(
        "grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        props.class
      )}
    />
  );
}

export function CardTitle(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-title"
      {...props}
      class={cn("typescale-title-medium text-on-surface", props.class)}
    />
  );
}

export function CardDescription(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-description"
      {...props}
      class={cn("typescale-body-medium text-on-surface-variant", props.class)}
    />
  );
}

export function CardAction(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-action"
      {...props}
      class={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end -mt-2 -mr-2",
        props.class
      )}
    />
  );
}

export function CardContent(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-content"
      {...props}
      class={cn("px-4 typescale-body-medium text-on-surface-variant", props.class)}
    />
  );
}

export function CardFooter(props: JSX.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="card-footer"
      {...props}
      class={cn("flex items-center justify-end gap-2 px-4", props.class)}
    />
  );
}
