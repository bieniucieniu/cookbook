import { serverApiOrigin } from "@/lib/api";
import { revalidate } from "@solidjs/router";
import { getRequestEvent, isServer, markSafeError } from "@solidjs/web";

export function isUnauthorized(error: unknown): boolean {
  return errorStatus(error) === 401;
}

/**
 * A non-2xx API answer. Marked safe: its message and status are meant for the reader, so a
 * production server render passes it to `<Errored>` instead of a generic "Internal Server Error".
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    markSafeError(this);
  }
}

/** The HTTP status of an API error, also after it was serialized from the server render. */
export function errorStatus(error: unknown): number | undefined {
  return error && typeof error === "object" && "status" in error && typeof error.status === "number"
    ? error.status
    : undefined;
}

export type ErrorType<TError> = ApiError & { data?: TError };

/**
 * Reads a response body: JSON when the type says so, text otherwise, undefined when empty.
 * A body labelled JSON that does not parse comes back as its text, so a broken error page from a
 * proxy still ends up as an ApiError with its status, not a SyntaxError.
 */
export async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text || response.status === 204 || response.status === 205 || response.status === 304)
    return undefined;
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("json")) return text;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** The API's `{ errors: string[] }` joined, else the status text, else `fallback`. */
export function errorMessage(response: Response, data: unknown, fallback: string): string {
  const errors =
    data && typeof data === "object" && "errors" in data
      ? (data as { errors?: unknown }).errors
      : undefined;
  return Array.isArray(errors) ? errors.join("; ") : response.statusText || fallback;
}

/** What Orval's `solid-start` client passes for every operation. */
export type RequestConfig = {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  data?: unknown;
  signal?: AbortSignal;
};

function search(params: Record<string, unknown> | undefined): string {
  if (!params) return "";
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    for (const item of Array.isArray(value) ? value : [value]) query.append(key, String(item));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
}

/** No retry when the answer will not change (signed out, forbidden, gone) or was cancelled. */
function final(error: unknown, signal: AbortSignal | undefined): boolean {
  const status = errorStatus(error);
  return signal?.aborted === true || status === 401 || status === 403 || status === 404;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Orval mutator. Returns the parsed body and throws an ApiError for any non-2xx answer. On the
 * server it calls the API directly and forwards the browser's cookies, so SSR sees the same
 * session. GETs retry up to three times with a short backoff, except on 401, 403, 404 or abort.
 */
export const customInstance = async <T>(config: RequestConfig): Promise<T> => {
  const headers = new Headers(config.headers);
  let url = `${config.url}${search(config.params)}`;
  if (isServer) {
    url = `${serverApiOrigin}${url}`;
    const cookie = getRequestEvent()?.request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);
  }
  const body =
    config.data === undefined || config.data instanceof FormData
      ? (config.data as FormData | undefined)
      : JSON.stringify(config.data);
  if (typeof body === "string" && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const attempts = config.method.toUpperCase() === "GET" ? 3 : 1;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body,
        credentials: "include",
        signal: config.signal,
      });
      const data = await readBody(response);
      if (!response.ok)
        throw new ApiError(response.status, errorMessage(response, data, "Request failed"));
      return data as T;
    } catch (error) {
      if (attempt >= attempts || final(error, config.signal)) throw error;
      await pause(200 * 2 ** (attempt - 1));
    }
  }
};

/**
 * Orval's solid-start client wraps every mutation in the router's form `action`, which needs
 * router context when it is called and fails from an event handler. orval.config.ts imports this
 * as `action` instead. A successful mutation revalidates every cached query (the router's own
 * default for a mutation), so callers never list the queries a write touches.
 */
export function mutation<Args extends unknown[], Result>(
  fn: (...args: Args) => Promise<Result>,
  _name: string
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    const result = await fn(...args);
    revalidate();
    return result;
  };
}
