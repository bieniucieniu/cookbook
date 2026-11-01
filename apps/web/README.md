Solid 1.9 client SPA. TanStack Router and TanStack Query. Vite+ on `:3000`, proxies `/api` to `:8080`.

```bash
pnpm install
pnpm --filter web dev
pnpm exec vp check
pnpm --filter web build
```

Routes live in `src/routes`. The router plugin (`target: "solid"`) generates `src/routeTree.gen.ts`.

Generate the API client while the server is on `:8080`:

```bash
pnpm --filter web generate-api
```

UI components come from the solid-kit registry. From this directory:

```bash
pnpm dlx shadcn@latest add bieniucieniu/solid-kit/button
```

Read [AGENTS.md](AGENTS.md) before editing. JSX looks like React. Components run once.
