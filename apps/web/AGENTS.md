# Solid

`apps/web` is Solid 1.9 and TanStack Router. Client SPA. No TanStack Start. No `@solidjs/router`. No React.

JSX looks like React. It is not React. A component function runs once to set up the DOM. There is no virtual DOM and no re-render. A later update runs only the expressions that read the changed signal.

Source: [Solid render-once model](https://github.com/solidjs/solid) and [eslint-plugin-solid reactivity](https://github.com/solidjs-community/eslint-plugin-solid/blob/main/packages/eslint-plugin-solid/docs/reactivity.md). Router accessors: `@tanstack/solid-router` skill `solid-router`.

## Write

- State: `const [count, setCount] = createSignal(0)`. Read with `count()`. Setter takes a value or `(prev) => next`.
- Derived: `createMemo`, or a function you call inside JSX. Do not copy a signal into a `let` and expect it to update.
- Side effects: `createEffect`. No dependency array. It tracks signals read inside it. Return a cleanup, or use `onCleanup`.
- One-time DOM setup: `onMount`. It does not track.
- Lists: `<For each={items()}>{(item) => ...}</For>`. Primitive lists: `<Index>`. Do not use `array.map` for a reactive list.
- Mount and unmount: `<Show when={...}>`. Branches: `<Switch>` and `<Match>`. An `if` in the component body runs once and will not update.
- Props: `function Button(props) { return <button>{props.label}</button> }`. Do not destructure props. Do not `const label = props.label` in the function body. A prop read belongs in JSX, `createMemo`, `createEffect`, or an event handler.
- Initial state from a prop is a snapshot. Name that prop `initial*` or `default*` so the snapshot is intentional.
- Context: pass the accessor (`value={count}`). Call it in the consumer. `value={count()}` is a snapshot. Provider `value` is not a tracked scope.
- Stores: read `state.field` inside JSX or a tracked scope. Do not destructure the store.
- Refs: `let el: HTMLButtonElement | undefined` and `ref={el}`. Assigned after render. Read it in `onMount` or an event handler.
- Events: `onClick={() => ...}`. The handler closes over accessors. Call them inside the handler.
- Import primitives from `solid-js`. Import `render` from `solid-js/web`. Import the router from `@tanstack/solid-router`.

## Do not

- Import `react`, `react-dom`, `@tanstack/react-*`, or `@solidjs/router`.
- `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `forwardRef`, `memo`, or dependency arrays.
- Solid 2 APIs. `@tanstack/solid-router` peers `solid-js` ^1.9.10.
- Cast router types. Register the router in `src/main.tsx`. `useSearch`, `useParams`, `useLoaderData`, `useRouterState`, and `useLocation` return an accessor. Call it: `search().page`. `useRouter()` and `useNavigate()` are not accessors.
- Destructure an accessor result (`const { page } = useSearch(...)()`). That copy will not update.
- Call hooks inside `loader` or `beforeLoad`. Those are plain functions.

Vite: `@tanstack/router-plugin` with `target: "solid"` comes before `vite-plugin-solid`. `tsconfig` `jsx` is `preserve`. `jsxImportSource` is `solid-js`.

<!-- intent-skills:start -->
# TanStack Intent - before editing files, run the matching guidance command.
tanstackIntent:
  - id: "@tanstack/solid-router#solid-router"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/solid-router#solid-router"
    for: "Solid bindings for TanStack Router. Hooks such as useSearch, useParams, useLoaderData, useRouterState, and useLocation return Accessor. Call the accessor. useRouter and useNavigate do not. Show, For, and createMemo around router state. Do not use @tanstack/react-router or @solidjs/router."
  - id: "@tanstack/router-plugin#router-plugin"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-plugin#router-plugin"
    for: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
  - id: "@tanstack/router-core#router-core"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core"
    for: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
  - id: "@tanstack/router-core#router-core/auth-and-guards"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/auth-and-guards"
    for: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
  - id: "@tanstack/router-core#router-core/code-splitting"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/code-splitting"
    for: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
  - id: "@tanstack/router-core#router-core/data-loading"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/data-loading"
    for: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
  - id: "@tanstack/router-core#router-core/navigation"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/navigation"
    for: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
  - id: "@tanstack/router-core#router-core/not-found-and-errors"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/not-found-and-errors"
    for: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
  - id: "@tanstack/router-core#router-core/path-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/path-params"
    for: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
  - id: "@tanstack/router-core#router-core/search-params"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/search-params"
    for: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
  - id: "@tanstack/router-core#router-core/ssr"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/ssr"
    for: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
  - id: "@tanstack/router-core#router-core/type-safety"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/router-core#router-core/type-safety"
    for: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
  - id: "@tanstack/virtual-file-routes#virtual-file-routes"
    run: "pnpm dlx @tanstack/intent@latest load @tanstack/virtual-file-routes#virtual-file-routes"
    for: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
<!-- intent-skills:end -->
