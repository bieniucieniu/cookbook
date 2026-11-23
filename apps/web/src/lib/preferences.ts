import { isServer } from "@solidjs/web";
import { createSignal } from "solid-js";

/**
 * A per-browser preference kept in localStorage and applied to <html>. `parse` and `apply` are
 * also inlined into the pre-paint script (`preferencesScript`, run from Document.tsx), so they
 * must be self-contained: no imports or outer variables.
 */
/** Plain data only: a string, or an object of strings. */
type PreferenceValue = string | { readonly [key: string]: string };

type PreferenceDef<T extends PreferenceValue> = {
  key: string;
  /** Stored text (or null) to a value; anything unknown falls back to the default. */
  parse: (stored: string | null) => T;
  /** The value to store, or null to remove the key (the default). */
  serialize: (value: T) => string | null;
  apply: (value: T, root: HTMLElement) => void;
};

export type ThemePreference = "light" | "dark" | "system";

const theme: PreferenceDef<ThemePreference> = {
  key: "cookbook:theme",
  parse: function (stored) {
    return stored === "light" || stored === "dark" ? stored : "system";
  },
  serialize: (value) => (value === "system" ? null : value),
  apply: function (value, root) {
    const dark =
      value === "dark" ||
      (value === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", dark);
  },
};

export type ReadingPreference = { scale: "1" | "1.125" | "1.25"; spacing: "normal" | "wide" };

/** Text size and letter spacing: the tokens index.css and m3-tokens.css read. */
const reading: PreferenceDef<ReadingPreference> = {
  key: "cookbook:reading",
  parse: function (stored) {
    let parsed: { scale?: unknown; spacing?: unknown } = {};
    try {
      parsed = JSON.parse(stored || "{}") || {};
    } catch {
      // Not JSON: use the defaults.
    }
    return {
      scale: parsed.scale === "1.125" || parsed.scale === "1.25" ? parsed.scale : "1",
      spacing: parsed.spacing === "wide" ? "wide" : "normal",
    };
  },
  serialize: (value) =>
    value.scale === "1" && value.spacing === "normal" ? null : JSON.stringify(value),
  apply: function (value, root) {
    const wide = value.spacing === "wide";
    root.style.setProperty("--reading-scale", value.scale);
    root.style.setProperty("--reading-tracking", wide ? "0.04em" : "0em");
    root.style.setProperty("--reading-word-spacing", wide ? "0.12em" : "normal");
  },
};

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
    return null;
  }
}

/**
 * The preference as a signal plus a setter that applies and stores it. The server renders the
 * default (it cannot read storage); the pre-paint script has already applied the stored value,
 * and markup must not depend on it. Other open tabs follow a change through the storage event.
 */
function createPreference<T extends PreferenceValue>(def: PreferenceDef<T>) {
  const fallback = def.parse(null);
  // Also a plain variable: signal writes apply on the next microtask, and <html> must change in
  // the same task as the choice.
  let current = isServer ? fallback : def.parse(stored(def.key));
  const [value, setValue] = createSignal<T>(current as Exclude<T, Function>);
  const apply = () => def.apply(current, document.documentElement);
  const update = (next: T) => {
    current = next;
    setValue(() => next);
    apply();
  };
  if (!isServer) {
    window.addEventListener("storage", (event) => {
      if (event.key === def.key || event.key === null) update(def.parse(event.newValue));
    });
  }
  return {
    value,
    current: () => current,
    apply,
    set(next: T) {
      update(next);
      try {
        const text = def.serialize(next);
        if (text === null) localStorage.removeItem(def.key);
        else localStorage.setItem(def.key, text);
      } catch {
        // Storage blocked: the choice lasts for this page only.
      }
    },
  };
}

export const themePreference = createPreference(theme);
export const readingPreference = createPreference(reading);

/** Runs in <head> before paint, so the first frame already has the stored preferences. */
export const preferencesScript = [theme, reading]
  .map(
    (def) =>
      `try{(${String(def.apply)})((${String(def.parse)})(localStorage.getItem(${JSON.stringify(def.key)})),document.documentElement)}catch(e){}`
  )
  .join(";");
