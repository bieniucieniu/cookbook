import { createRouter, intentPreload } from "@solidjs/router";
import { fileRoutes } from "@solidjs/router/fs";
import { pageRoutes } from "virtual:file-routes";
import { registerPaths } from "./paths";

/** One router instance for App.tsx. Links preload their page's code and data on hover or focus. */
export const Router = createRouter({
  routes: fileRoutes(pageRoutes),
  preloadLinks: intentPreload(),
});

registerPaths(Router.paths);
