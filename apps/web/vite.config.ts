import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [tanstackRouter({ target: "solid", autoCodeSplitting: true }), solid()],
  server: {
    port: 3000,
    host: true,
    fs: { allow: ["../.."] },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
})

export default config
