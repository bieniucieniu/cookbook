import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

export function Table(props: JSX.HTMLAttributes<HTMLTableElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <div data-slot="table-container" class="relative w-full overflow-x-auto">
      <table
        ref={props.ref}
        data-slot="table"
        class={cn("w-full caption-bottom text-xs", props.class)}
        {...rest}
      />
    </div>
  );
}

export function TableHeader(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <thead
      ref={props.ref}
      data-slot="table-header"
      class={cn("[&_tr]:border-b", props.class)}
      {...rest}
    />
  );
}

export function TableBody(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <tbody
      ref={props.ref}
      data-slot="table-body"
      class={cn("[&_tr:last-child]:border-0", props.class)}
      {...rest}
    />
  );
}

export function TableFooter(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <tfoot
      ref={props.ref}
      data-slot="table-footer"
      class={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", props.class)}
      {...rest}
    />
  );
}

export function TableRow(props: JSX.HTMLAttributes<HTMLTableRowElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <tr
      ref={props.ref}
      data-slot="table-row"
      class={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        props.class
      )}
      {...rest}
    />
  );
}

export function TableHead(props: JSX.ThHTMLAttributes<HTMLTableCellElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <th
      ref={props.ref}
      data-slot="table-head"
      class={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        props.class
      )}
      {...rest}
    />
  );
}

export function TableCell(props: JSX.TdHTMLAttributes<HTMLTableCellElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <td
      ref={props.ref}
      data-slot="table-cell"
      class={cn("p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", props.class)}
      {...rest}
    />
  );
}

export function TableCaption(props: JSX.HTMLAttributes<HTMLTableCaptionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <caption
      ref={props.ref}
      data-slot="table-caption"
      class={cn("mt-4 text-xs text-muted-foreground", props.class)}
      {...rest}
    />
  );
}
