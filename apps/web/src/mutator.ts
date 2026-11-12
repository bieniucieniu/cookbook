export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ErrorType<TError> = ApiError & { data?: TError };

export type BodyType<TBody> = TBody;

type MutatorInit = RequestInit & { schema?: unknown };

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

export const customInstance = async <T>(url: string, init: MutatorInit = {}): Promise<T> => {
  const { schema: _schema, ...request } = init;
  const response = await fetch(url, {
    ...request,
    credentials: "include",
  });

  const data = await readBody(response);
  if (!response.ok)
    throw new ApiError(response.status, errorMessage(response, data, "Request failed"));

  return { data, status: response.status, headers: response.headers } as T;
};
