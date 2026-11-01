import type { JSX } from "solid-js";
import { splitProps } from "solid-js";
import { cn } from "@/lib/utils";

function TableRoot(props: JSX.HTMLAttributes<HTMLTableElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <table
      ref={props.ref}
      class={cn("w-full caption-bottom border-collapse text-xs", props.class)}
      {...rest}
    />
  );
}

export function TableHeader(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <thead ref={props.ref} class={cn("[&_tr]:border-b", props.class)} {...rest} />;
}

export function TableBody(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return <tbody ref={props.ref} class={props.class} {...rest} />;
}

export function TableRow(props: JSX.HTMLAttributes<HTMLTableRowElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <tr
      ref={props.ref}
      class={cn("border-b border-border transition-colors hover:bg-muted/50", props.class)}
      {...rest}
    />
  );
}

export function TableHead(props: JSX.ThHTMLAttributes<HTMLTableCellElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <th
      ref={props.ref}
      class={cn(
        "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground",
        props.class
      )}
      {...rest}
    />
  );
}

export function TableCell(props: JSX.TdHTMLAttributes<HTMLTableCellElement>) {
  const [, rest] = splitProps(props, ["class", "ref"]);
  return (
    <td ref={props.ref} class={cn("p-2 align-middle whitespace-nowrap", props.class)} {...rest} />
  );
}

export const Table = Object.assign(TableRoot, {
  Header: TableHeader,
  Body: TableBody,
  Row: TableRow,
  Head: TableHead,
  Cell: TableCell,
});
