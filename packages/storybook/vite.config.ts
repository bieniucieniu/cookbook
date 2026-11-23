import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

/**
 * Storybook 11 builds stories with this config. The stories live in apps/web, so it compiles
 * Solid 2 JSX, runs Tailwind, and maps the app's `@/` alias.
 */
export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: { alias: { "@": path("../../apps/web/src") } },
  optimizeDeps: { exclude: ["@ui-sdk/core"] },
  server: { fs: { allow: [path("../..")] } },
});
