const baseURL = "/api"

export type ErrorType<TError = unknown> = Error & {
  status?: number
  info?: TError
}

export type BodyType<BodyData> = BodyData

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return undefined
  }
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    return response.json()
  }
  return response.text()
}

export const customInstance = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseURL}${url}`, {
    ...options,
    credentials: "include",
  })
  if (!response.ok) {
    const error: ErrorType = new Error(response.statusText)
    error.status = response.status
    try {
      error.info = await parseBody(response)
    } catch {
      error.info = undefined
    }
    throw error
  }
  return {
    data: await parseBody(response),
    status: response.status,
    headers: response.headers,
  } as T
}

export default customInstance
