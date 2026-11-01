import { defineConfig } from "vite-plus";

const ignore = [
  "dist/**",
  "**/dist/**",
  "**/build/**",
  "**/.gradle/**",
  "**/.devenv/**",
  "**/.devenv*/**",
  "apps/web/src/routeTree.gen.ts",
  "apps/web/src/generated/**",
  "**/*.kt",
  "**/*.kts",
  "**/*.sql",
  "**/*.sq",
  "**/*.nix",
  "gradle/wrapper/**",
  "gradlew",
  "gradlew.bat",
];

export default defineConfig({
  defaultPackage: "./apps/web",
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    singleQuote: false,
    semi: true,
    trailingComma: "es5",
    ignorePatterns: ignore,
  },
  lint: {
    ignorePatterns: ignore,
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
