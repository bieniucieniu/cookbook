import tailwindcss from "@tailwindcss/vite";
import { defineMain } from "storybook-solidjs-vite";
import { mergeConfig, type UserConfig } from "vite";

function filePath(relativeToThisFile: string): string {
  const pathname = decodeURIComponent(new URL(relativeToThisFile, import.meta.url).pathname);
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

const repoRoot = filePath("../../..");

export default defineMain({
  stories: ["../../../apps/**/*.stories.@(ts|tsx)", "../../../packages/**/*.stories.@(ts|tsx)"],
  framework: "storybook-solidjs-vite",
  async viteFinal(config) {
    return mergeConfig(config, {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "@": filePath("../../../apps/web/src"),
        },
      },
      server: {
        fs: {
          allow: [repoRoot],
        },
      },
    }) as UserConfig;
  },
});
