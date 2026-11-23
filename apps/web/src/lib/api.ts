/**
 * Versioned API prefix. The server mounts every endpoint here (apps/api `ApiVersion.V1`), and
 * the generated client already carries it in each URL. Use this for hand-written URLs only:
 * browser navigations (login, logout), multipart uploads, and image `src`.
 */
export const apiBase = "/api/v1";

export function photoUrl(id: number): string {
  return `${apiBase}/photos/${id}`;
}

/**
 * Origin of the Kotlin API (apps/api) for server-side requests: the SSR mutator and the
 * production `/api` proxy (src/middleware.ts). `API_ORIGIN` overrides it; vite.config.ts reads the
 * same variable for the dev proxy.
 */
export const serverApiOrigin =
  (typeof process !== "undefined" ? process.env.API_ORIGIN : undefined) ?? "http://127.0.0.1:8080";
