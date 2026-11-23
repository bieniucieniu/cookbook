import type { Router } from "./router";

type Paths = (typeof Router)["paths"];

let registered: Paths | undefined;

/** Called once by router.ts with the router's typed path builder. */
export function registerPaths(value: Paths): void {
  registered = value;
}

/**
 * The router's typed path builder (`paths.recipes(id).edit`), for routes and components. It is
 * forwarded here instead of imported from router.ts: router.ts imports every route module
 * eagerly, so a route importing it back would form a cycle that breaks hot reload.
 */
export const paths = new Proxy((() => undefined) as unknown as Paths, {
  get: (_target, key) => Reflect.get(registered as object, key),
  apply: (_target, _this, args: unknown[]) =>
    (registered as unknown as (...args: unknown[]) => unknown)(...args),
});
