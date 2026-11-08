/**
 * Versioned API prefix. The server mounts every endpoint here (apps/api `ApiVersion.V1`), and
 * the generated client already carries it in each URL. Use this for hand-written URLs only:
 * browser navigations (login, logout), multipart uploads, and image `src`.
 */
export const apiBase = "/api/v1";

export function photoUrl(id: number): string {
  return `${apiBase}/photos/${id}`;
}
