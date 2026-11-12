import { IconDeviceDesktop, IconMoon, IconSun, type TablerIcon } from "@/components/icons";
import { IconButton } from "@/components/m3/icon-button";
import {
  Menu,
  MenuContent,
  MenuItemIcon,
  MenuItemIndicator,
  MenuItemLabel,
  MenuPortal,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/m3/menu";
import { createSignal, For } from "solid-js";
import { Dynamic } from "solid-js/web";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";

/** Also read by the inline script in index.html, which sets `.dark` before first paint. */
export const THEME_STORAGE_KEY = "cookbook:theme";

const options: { value: ThemePreference; label: string; icon: TablerIcon }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "System", icon: IconDeviceDesktop },
];

function parsePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

const [preference, setPreference] = createSignal<ThemePreference>("system");
const [systemTheme, setSystemTheme] = createSignal<Theme>("light");
const theme = (): Theme => {
  const current = preference();
  return current === "system" ? systemTheme() : current;
};

function applyTheme() {
  document.documentElement.classList.toggle("dark", theme() === "dark");
}

function setThemePreference(next: ThemePreference) {
  setPreference(next);
  applyTheme();
  try {
    if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
}

try {
  setPreference(parsePreference(localStorage.getItem(THEME_STORAGE_KEY)));
} catch {
  // Storage blocked: keep following the OS.
}

// In "system" mode, follow the OS theme live, not only on load.
const media = matchMedia("(prefers-color-scheme: dark)");
setSystemTheme(media.matches ? "dark" : "light");
media.addEventListener("change", (event) => {
  setSystemTheme(event.matches ? "dark" : "light");
  applyTheme();
});

// Keep other open tabs in step when the choice changes in one of them.
window.addEventListener("storage", (event) => {
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
  setPreference(parsePreference(event.newValue));
  applyTheme();
});

/** Light, dark, or follow the OS. The `.dark` class on <html> picks the trigger icon. */
export function ThemeToggle() {
  return (
    <Menu placement="bottom-end">
      <MenuTrigger as={IconButton} aria-label="Theme">
        <IconSun class="dark:hidden" aria-hidden="true" />
        <IconMoon class="hidden dark:inline" aria-hidden="true" />
      </MenuTrigger>
      <MenuPortal>
        <MenuContent class="min-w-40">
          <MenuRadioGroup
            value={preference()}
            onChange={(value) => setThemePreference(parsePreference(value))}
          >
            <For each={options}>
              {(option) => (
                <MenuRadioItem value={option.value}>
                  <MenuItemIcon>
                    <Dynamic component={option.icon} aria-hidden="true" />
                  </MenuItemIcon>
                  <MenuItemLabel>{option.label}</MenuItemLabel>
                  <MenuItemIndicator />
                </MenuRadioItem>
              )}
            </For>
          </MenuRadioGroup>
        </MenuContent>
      </MenuPortal>
    </Menu>
  );
}
