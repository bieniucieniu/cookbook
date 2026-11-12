import { IconTextSize } from "@/components/icons";
import { IconButton } from "@/components/m3/icon-button";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItemIndicator,
  MenuItemLabel,
  MenuPortal,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/m3/menu";
import { createEffect, createSignal, For } from "solid-js";

type Prefs = { scale: "1" | "1.125" | "1.25"; spacing: "normal" | "wide" };

const scales: { value: Prefs["scale"]; label: string }[] = [
  { value: "1", label: "Default" },
  { value: "1.125", label: "Large" },
  { value: "1.25", label: "Larger" },
];

const spacings: { value: Prefs["spacing"]; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
];

const storageKey = "cookbook:reading";
const fallback: Prefs = { scale: "1", spacing: "normal" };

function load(): Prefs {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    const scale = "scale" in parsed ? parsed.scale : undefined;
    const spacing = "spacing" in parsed ? parsed.spacing : undefined;
    return {
      scale: scale === "1.125" || scale === "1.25" ? scale : "1",
      spacing: spacing === "wide" ? "wide" : "normal",
    };
  } catch {
    return fallback;
  }
}

/**
 * Text size and letter spacing for this browser. Sets the tokens read in index.css and
 * m3-tokens.css. The menu stays open on a pick so the change can be seen.
 */
export function ReadingPrefs() {
  const [prefs, setPrefs] = createSignal(load());

  createEffect(() => {
    const current = prefs();
    const root = document.documentElement.style;
    root.setProperty("--reading-scale", current.scale);
    root.setProperty("--reading-tracking", current.spacing === "wide" ? "0.04em" : "0em");
    root.setProperty("--reading-word-spacing", current.spacing === "wide" ? "0.12em" : "normal");
    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      return;
    }
  });

  return (
    <Menu placement="bottom-end">
      <MenuTrigger as={IconButton} aria-label="Reading settings">
        <IconTextSize aria-hidden="true" />
      </MenuTrigger>
      <MenuPortal>
        <MenuContent class="min-w-48">
          <MenuGroup>
            <MenuGroupLabel>Text size</MenuGroupLabel>
            <MenuRadioGroup
              value={prefs().scale}
              onChange={(value) => {
                if (value === "1" || value === "1.125" || value === "1.25")
                  setPrefs((current) => ({ ...current, scale: value }));
              }}
            >
              <For each={scales}>
                {(option) => (
                  <MenuRadioItem value={option.value} closeOnSelect={false}>
                    <MenuItemLabel>{option.label}</MenuItemLabel>
                    <MenuItemIndicator />
                  </MenuRadioItem>
                )}
              </For>
            </MenuRadioGroup>
          </MenuGroup>
          <MenuSeparator />
          <MenuGroup>
            <MenuGroupLabel>Letter spacing</MenuGroupLabel>
            <MenuRadioGroup
              value={prefs().spacing}
              onChange={(value) => {
                if (value === "normal" || value === "wide")
                  setPrefs((current) => ({ ...current, spacing: value }));
              }}
            >
              <For each={spacings}>
                {(option) => (
                  <MenuRadioItem value={option.value} closeOnSelect={false}>
                    <MenuItemLabel>{option.label}</MenuItemLabel>
                    <MenuItemIndicator />
                  </MenuRadioItem>
                )}
              </For>
            </MenuRadioGroup>
          </MenuGroup>
        </MenuContent>
      </MenuPortal>
    </Menu>
  );
}
