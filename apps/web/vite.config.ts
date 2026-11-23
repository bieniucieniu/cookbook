import solid from "@solidjs/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { fileRoutes } from "filesystem-routing/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import { serverApiOrigin } from "./src/lib/api";

const api = {
  "/api": {
    target: serverApiOrigin,
    changeOrigin: true,
  },
};

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: lazyPlugins(() => [
    tailwindcss(),
    // Solid 2 start mode (the SolidStart successor): SSR of src/App.tsx inside src/Document.tsx.
    // `async` renders sends one complete document once every <Loading> has settled, so a missing
    // recipe answers 404 and crawlers see content, not fallbacks. `vp build` writes the client to
    // dist/client and a Node server to dist/server/node.js; src/middleware.ts proxies /api to the
    // Kotlin API there.
    solid({
      start: { nodeServer: true, middleware: "./src/middleware.ts", renderMode: "async" },
      ssr: true,
      // Also compile the `?pick=` route modules the fileRoutes plugin emits.
      extensions: [".jsx", ".tsx"],
    }),
    // Route modules load eagerly: the app has a handful of routes, its heavy parts (the editor,
    // tiptap) are already split with clientOnly, and a lazy child route that the server did not
    // render (its layout errored, as on a 404) cannot hydrate.
    fileRoutes({ types: true, codeSplitting: false }),
  ]),
  // Bundle every dependency into the server build, so dist/ runs without node_modules.
  ssr: { noExternal: true },
  // One copy of @ui-sdk/core for the app and @ui-sdk/solid.
  optimizeDeps: { exclude: ["@ui-sdk/core"] },
  server: {
    port: 3000,
    host: true,
    fs: { allow: ["../.."] },
    proxy: api,
  },
  preview: {
    port: 4173,
    host: true,
    proxy: api,
  },
});

export default config;
