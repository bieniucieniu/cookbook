Solid 1.9 client SPA. TanStack Router only. Vite on `:3000`, proxies `/api` to `:8080`.

```bash
pnpm install
pnpm --filter web dev
```

Routes live in `src/routes`. The router plugin (`target: "solid"`) generates `src/routeTree.gen.ts`.

```bash
pnpm --filter web generate-routes
pnpm --filter web build
```

Read [AGENTS.md](AGENTS.md) before editing. JSX looks like React. Components run once.
