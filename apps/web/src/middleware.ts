import { serverApiOrigin } from "@/lib/api";
import type { StartMiddleware } from "@solidjs/vite-plugin";

/**
 * Proxies `/api/*` to the Kotlin API, so the production server (`node dist/server/node.js`)
 * serves the app and the API from one origin, like the Vite dev proxy does. Cookies, the body
 * and redirects pass through unchanged.
 */
const proxyApi: StartMiddleware = async (event, next) => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith("/api/")) return next();
  const target = new URL(`${url.pathname}${url.search}`, serverApiOrigin);
  const headers = new Headers(event.request.headers);
  headers.delete("host");
  const hasBody = event.request.method !== "GET" && event.request.method !== "HEAD";
  return fetch(target, {
    method: event.request.method,
    headers,
    body: hasBody ? event.request.body : undefined,
    redirect: "manual",
    signal: event.request.signal,
    // Node needs this to stream a request body.
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);
};

export default proxyApi;
