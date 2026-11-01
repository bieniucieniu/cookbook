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

export const customInstance = async <T>(url: string, init: MutatorInit = {}): Promise<T> => {
  const { schema: _schema, ...request } = init;
  const response = await fetch(url.startsWith("http") ? url : `/api${url}`, {
    ...request,
    credentials: "include",
  });

  const text = await response.text();
  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const data: unknown =
    !text || response.status === 204 || response.status === 205 || response.status === 304
      ? undefined
      : contentType.includes("json")
        ? JSON.parse(text)
        : text;

  if (!response.ok) {
    const errors =
      data && typeof data === "object" && "errors" in data
        ? (data as { errors?: unknown }).errors
        : undefined;
    const message = Array.isArray(errors)
      ? errors.join("; ")
      : response.statusText || "Request failed";
    throw new ApiError(response.status, message);
  }

  return { data, status: response.status, headers: response.headers } as T;
};
