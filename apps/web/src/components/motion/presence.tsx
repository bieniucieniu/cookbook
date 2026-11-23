import type { JSX } from "@solidjs/web";
import {
  type Accessor,
  For,
  Show,
  createContext,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  getOwner,
  onCleanup,
  onSettled,
  runWithOwner,
  untrack,
  useContext,
} from "solid-js";

export interface PresenceState {
  isPresent: () => boolean;
  blockInitial: () => boolean;
  popLayout: () => boolean;
  anchorX: () => "left" | "right";
  anchorY: () => "top" | "bottom";
  hasCustom: boolean;
  custom: () => unknown;
  registerExit: (done: Promise<void>) => void;
}

export const PresenceContext = createContext<PresenceState | null>(null);

export function useIsPresent(): Accessor<boolean> {
  const presence = useContext(PresenceContext);
  return () => presence?.isPresent() ?? true;
}

export type PresenceMode = "sync" | "wait" | "popLayout";

export interface AnimatePresenceProps<T = unknown> {
  when?: boolean | Accessor<boolean>;
  each?: readonly T[] | Accessor<readonly T[]>;
  by?: (item: T) => string | number;
  mode?: PresenceMode;
  initial?: boolean;
  custom?: unknown;
  anchorX?: "left" | "right";
  anchorY?: "top" | "bottom";
  onExitComplete?: () => void;
  children?: JSX.Element | ((item: T, index: Accessor<number>) => JSX.Element);
}

interface Row<T> {
  key: string;
  item: Accessor<T>;
  setItem: (item: T) => void;
  index: Accessor<number>;
  setIndex: (index: number) => void;
  present: Accessor<boolean>;
  setPresent: (present: boolean) => void;
  /** Initial animations are skipped for this row (the presence-wide block, or it already entered). */
  block: { readonly current: boolean };
}

function readFlag(source: boolean | Accessor<boolean> | undefined, fallback: boolean): boolean {
  if (source === undefined) return fallback;
  if (typeof source === "function") return source();
  return source;
}

function readList<T>(
  source: readonly T[] | Accessor<readonly T[]> | undefined
): readonly T[] | undefined {
  if (source === undefined) return undefined;
  if (typeof source === "function") {
    const value = source();
    return Array.isArray(value) ? value : undefined;
  }
  return source;
}

export function AnimatePresence<T>(props: AnimatePresenceProps<T>) {
  const block = { current: props.initial === false };
  onSettled(() => {
    queueMicrotask(() => {
      block.current = false;
    });
  });

  const objectIds = new WeakMap<object, number>();
  let nextId = 1;

  function keyFor(item: T, _index: number): string {
    if (props.by) return String(props.by(item));
    if (typeof item === "object" && item !== null) {
      const found = objectIds.get(item);
      if (found !== undefined) return `o${found}`;
      const id = nextId;
      nextId += 1;
      objectIds.set(item, id);
      return `o${id}`;
    }
    return `p${String(item)}`;
  }

  const roots = new Map<string, { dispose: () => void; row: Row<T> }>();
  const rowEntered = new Map<string, () => void>();
  // Rows are created from the list effect's apply phase, which has no owner of its own.
  const owner = getOwner();
  const entered = new Set<string>();

  function ensure(item: T, index: number): Row<T> {
    const key = keyFor(item, index);
    const found = roots.get(key);
    if (found) {
      found.row.setItem(item);
      found.row.setIndex(index);
      found.row.setPresent(true);
      return found.row;
    }
    let row: Row<T> | undefined;
    const dispose = runWithOwner(owner, () =>
      createRoot((done) => {
        const [present, setPresent] = createSignal(true);
        // Functions and objects are stored as values, not as signal updaters.
        const [currentItem, setCurrentItem] = createSignal<{ value: T }>({ value: item });
        const [currentIndex, setIndex] = createSignal(index);
        let entered = false;
        row = {
          key,
          item: () => currentItem().value,
          setItem: (next) => {
            if (untrack(currentItem).value !== next) setCurrentItem({ value: next });
          },
          index: currentIndex,
          setIndex,
          present,
          setPresent,
          block: {
            get current() {
              return block.current || entered;
            },
          },
        };
        const markEntered = () => {
          entered = true;
        };
        rowEntered.set(key, markEntered);
        return done;
      })
    );
    if (!row || !dispose) throw new Error("AnimatePresence failed to create a row");
    roots.set(key, { dispose, row });
    return row;
  }

  const [order, setOrder] = createSignal<Row<T>[]>(
    untrack(() => {
      const list = readList(props.each);
      if (!list) return [];
      return list.map((item, index) => ensure(item, index));
    })
  );

  function finish(key: string) {
    entered.delete(key);
    // Writes land on the next microtask, so work out what remains from the list itself.
    const remaining = untrack(order).filter((row) => row.key !== key);
    setOrder(remaining);
    queueMicrotask(() => {
      const found = roots.get(key);
      roots.delete(key);
      rowEntered.delete(key);
      found?.dispose();
    });
    const stillExiting = remaining.some((row) => !untrack(row.present));
    if (!stillExiting) props.onExitComplete?.();
  }

  // Compute reads the list; the apply phase creates rows and writes the order.
  createEffect(
    () => readList(props.each),
    (list) => {
      if (!list) return;
      const prev = untrack(order);
      const presentRows = list.map((item, index) => ensure(item, index));
      const presentKeys = new Set(presentRows.map((row) => row.key));
      const merged = presentRows.slice();
      prev.forEach((row, index) => {
        if (presentKeys.has(row.key)) return;
        row.setPresent(false);
        merged.splice(Math.min(index, merged.length), 0, row);
      });
      setOrder(merged);
    }
  );

  const shown = createMemo(() => {
    const rows = order();
    const waiting = props.mode === "wait" && rows.some((row) => !row.present());
    const visible: Row<T>[] = [];
    for (const row of rows) {
      if (!row.present()) {
        visible.push(row);
        continue;
      }
      if (waiting && !entered.has(row.key)) continue;
      entered.add(row.key);
      visible.push(row);
    }
    return visible;
  });

  const listMode = createMemo(() => readList(props.each) !== undefined);

  // A row's content is built from its current item. A kept key with a new item object rebuilds
  // only that row; it has already entered, so the rebuilt motion elements skip `initial`.
  function renderRow(row: Row<T>) {
    const render = props.children;
    if (typeof render !== "function") return render;
    return createMemo(() => {
      const item = row.item();
      const element = untrack(() => render(item, row.index));
      rowEntered.get(row.key)?.();
      return element;
    }) as unknown as JSX.Element;
  }

  return (
    <Show
      when={listMode()}
      fallback={
        <WhenPresence
          when={props.when}
          mode={props.mode}
          custom={props.custom}
          anchorX={props.anchorX}
          anchorY={props.anchorY}
          block={block}
          onExitComplete={props.onExitComplete}
        >
          {props.children as JSX.Element}
        </WhenPresence>
      }
    >
      <For each={shown()}>
        {(row) => (
          <PresenceScope
            present={row.present}
            mode={props.mode}
            custom={props.custom}
            anchorX={props.anchorX}
            anchorY={props.anchorY}
            block={row.block}
            onDone={() => finish(row.key)}
          >
            {renderRow(row)}
          </PresenceScope>
        )}
      </For>
    </Show>
  );
}

function WhenPresence(props: {
  when?: boolean | Accessor<boolean>;
  mode?: PresenceMode;
  custom?: unknown;
  anchorX?: "left" | "right";
  anchorY?: "top" | "bottom";
  block: { current: boolean };
  onExitComplete?: () => void;
  children?: JSX.Element;
}) {
  const [mounted, setMounted] = createSignal(untrack(() => readFlag(props.when, true)));
  const [present, setPresent] = createSignal(true);
  let pendingShow = false;

  createEffect(
    () => readFlag(props.when, true),
    (show) => {
      if (show) {
        if (props.mode === "wait" && untrack(mounted) && !untrack(present)) {
          pendingShow = true;
          return;
        }
        pendingShow = false;
        setMounted(true);
        setPresent(true);
        return;
      }
      if (!untrack(mounted)) return;
      setPresent(false);
    }
  );

  function done() {
    if (readFlag(props.when, true) && props.mode !== "wait") return;
    setMounted(false);
    if (pendingShow || (props.mode === "wait" && readFlag(props.when, true))) {
      pendingShow = false;
      setPresent(true);
      setMounted(true);
      return;
    }
    props.onExitComplete?.();
  }

  return (
    <Show when={mounted()}>
      <PresenceScope
        present={present}
        mode={props.mode}
        custom={props.custom}
        anchorX={props.anchorX}
        anchorY={props.anchorY}
        block={props.block}
        onDone={done}
      >
        {props.children}
      </PresenceScope>
    </Show>
  );
}

function PresenceScope(props: {
  present: Accessor<boolean>;
  mode?: PresenceMode;
  custom?: unknown;
  anchorX?: "left" | "right";
  anchorY?: "top" | "bottom";
  block: { current: boolean };
  onDone: () => void;
  children?: JSX.Element;
}) {
  const exits: Promise<void>[] = [];
  let token = 0;
  const api: PresenceState = {
    isPresent: () => props.present(),
    blockInitial: () => props.block.current,
    popLayout: () => props.mode === "popLayout",
    anchorX: () => props.anchorX ?? "left",
    anchorY: () => props.anchorY ?? "top",
    hasCustom: props.custom !== undefined,
    custom: () => props.custom,
    registerExit(done) {
      exits.push(done);
    },
  };

  createEffect(
    () => props.present(),
    (present) => {
      if (present) {
        token += 1;
        exits.length = 0;
        return;
      }
      const current = token + 1;
      token = current;
      queueMicrotask(() => {
        if (current !== token) return;
        const pending = exits.slice();
        if (pending.length === 0) {
          props.onDone();
          return;
        }
        void Promise.all(pending).then(() => {
          if (current === token) props.onDone();
        });
      });
    }
  );

  onCleanup(() => {
    token += 1;
  });

  return <PresenceContext value={api}>{props.children}</PresenceContext>;
}
