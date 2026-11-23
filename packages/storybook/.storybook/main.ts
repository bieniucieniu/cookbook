import { defineMain } from "storybook-solidjs-vite";

// Plugins (Solid 2, Tailwind) and the `@/` alias come from ../vite.config.ts.
export default defineMain({
  stories: ["../../../apps/**/*.stories.@(ts|tsx)", "../../../packages/**/*.stories.@(ts|tsx)"],
  framework: "storybook-solidjs-vite",
});
