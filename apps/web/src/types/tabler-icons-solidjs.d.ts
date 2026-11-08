// @tabler/icons-solidjs 3.50 ships no .d.ts (its `types` path is missing from the tarball).
// Declare the icons the app uses. Add a name here and in components/icons.ts together.
declare module "@tabler/icons-solidjs" {
  import type { Component, JSX } from "solid-js";

  export type TablerIconProps = Omit<JSX.SvgSVGAttributes<SVGSVGElement>, "stroke"> & {
    size?: number | string;
    stroke?: number | string;
    color?: string;
    title?: string;
  };
  export type TablerIcon = Component<TablerIconProps>;

  export const IconAlertTriangle: TablerIcon;
  export const IconArrowDown: TablerIcon;
  export const IconArrowUp: TablerIcon;
  export const IconArrowsShuffle: TablerIcon;
  export const IconArrowsSplit: TablerIcon;
  export const IconCarrot: TablerIcon;
  export const IconCheck: TablerIcon;
  export const IconChefHat: TablerIcon;
  export const IconChevronLeft: TablerIcon;
  export const IconChevronRight: TablerIcon;
  export const IconClock: TablerIcon;
  export const IconCopy: TablerIcon;
  export const IconDeviceDesktop: TablerIcon;
  export const IconDeviceFloppy: TablerIcon;
  export const IconDots: TablerIcon;
  export const IconEye: TablerIcon;
  export const IconFlag: TablerIcon;
  export const IconGitBranch: TablerIcon;
  export const IconHandStop: TablerIcon;
  export const IconHourglass: TablerIcon;
  export const IconLayoutList: TablerIcon;
  export const IconLock: TablerIcon;
  export const IconMinus: TablerIcon;
  export const IconMoon: TablerIcon;
  export const IconNote: TablerIcon;
  export const IconPencil: TablerIcon;
  export const IconPhoto: TablerIcon;
  export const IconPlayerPause: TablerIcon;
  export const IconPlayerPlay: TablerIcon;
  export const IconPlus: TablerIcon;
  export const IconSettings: TablerIcon;
  export const IconRepeat: TablerIcon;
  export const IconShare: TablerIcon;
  export const IconSitemap: TablerIcon;
  export const IconSun: TablerIcon;
  export const IconTextSize: TablerIcon;
  export const IconToolsKitchen2: TablerIcon;
  export const IconTrash: TablerIcon;
  export const IconUsers: TablerIcon;
  export const IconWorld: TablerIcon;
  export const IconX: TablerIcon;
}
