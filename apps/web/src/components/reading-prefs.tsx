import { IconTextSize } from "@/components/icons";
import { iconButtonVariants } from "@/components/m3/icon-button";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItemIndicator,
  MenuItemLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
} from "@/components/m3/menu";
import { type ReadingPreference, readingPreference } from "@/lib/preferences";
import { For } from "solid-js";

type Prefs = ReadingPreference;

const scales: { value: Prefs["scale"]; label: string }[] = [
  { value: "1", label: "Default" },
  { value: "1.125", label: "Large" },
  { value: "1.25", label: "Larger" },
];

const spacings: { value: Prefs["spacing"]; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
];

/**
 * Text size and letter spacing for this browser. Sets the tokens read in index.css and
 * m3-tokens.css. Radio items keep the menu open, so the change can be seen.
 */
export function ReadingPrefs() {
  const prefs = readingPreference.value;
  const setPrefs = (update: (current: Prefs) => Prefs) =>
    readingPreference.set(update(readingPreference.current()));

  return (
    <Menu>
      <MenuTrigger aria-label="Reading settings" class={iconButtonVariants()}>
        <IconTextSize aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="end" class="min-w-48">
        <MenuGroup>
          <MenuGroupLabel>Text size</MenuGroupLabel>
          <MenuRadioGroup
            value={prefs().scale}
            onValueChange={(value) => {
              if (value === "1" || value === "1.125" || value === "1.25")
                setPrefs((current) => ({ ...current, scale: value }));
            }}
          >
            <For each={scales}>
              {(option) => (
                <MenuRadioItem value={option.value}>
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
            onValueChange={(value) => {
              if (value === "normal" || value === "wide")
                setPrefs((current) => ({ ...current, spacing: value }));
            }}
          >
            <For each={spacings}>
              {(option) => (
                <MenuRadioItem value={option.value}>
                  <MenuItemLabel>{option.label}</MenuItemLabel>
                  <MenuItemIndicator />
                </MenuRadioItem>
              )}
            </For>
          </MenuRadioGroup>
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}
