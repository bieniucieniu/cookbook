import { IconDeviceDesktop, IconMoon, IconSun, type TablerIcon } from "@/components/icons";
import { iconButtonVariants } from "@/components/m3/icon-button";
import {
  Menu,
  MenuContent,
  MenuItemIcon,
  MenuItemIndicator,
  MenuItemLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "@/components/m3/menu";
import { isServer } from "@solidjs/web";
import { For } from "solid-js";
import { type ThemePreference, themePreference } from "@/lib/preferences";

const options: { value: ThemePreference; label: string; icon: TablerIcon }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "system", label: "System", icon: IconDeviceDesktop },
];

// In "system" mode, follow the OS theme live, not only on load.
if (!isServer) {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (themePreference.current() === "system") themePreference.apply();
  });
}

/**
 * Light, dark, or follow the OS. The server cannot know the theme, so both trigger icons render
 * and the `.dark` class on <html> picks one from the first paint.
 */
export function ThemeToggle() {
  return (
    <Menu>
      <MenuTrigger aria-label="Theme" class={iconButtonVariants()}>
        <IconSun class="dark:hidden" aria-hidden="true" />
        <IconMoon class="hidden dark:inline" aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="end" class="min-w-40">
        <MenuRadioGroup
          value={themePreference.value()}
          onValueChange={(value) => themePreference.set(value as ThemePreference)}
        >
          <For each={options}>
            {(option) => {
              const Icon = option.icon;
              return (
                <MenuRadioItem value={option.value} closeOnSelect>
                  <MenuItemIcon>
                    <Icon aria-hidden="true" />
                  </MenuItemIcon>
                  <MenuItemLabel>{option.label}</MenuItemLabel>
                  <MenuItemIndicator />
                </MenuRadioItem>
              );
            }}
          </For>
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
