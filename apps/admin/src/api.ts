export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin${path}`, {
      ...options,
      credentials: "same-origin",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: options.signal ?? AbortSignal.timeout(15000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      503,
      "The API is unavailable. Check that it is running and try again.",
    );
  }
  const body: unknown = await response.json().catch(() => null);
  const object =
    body !== null && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof object?.error === "string"
        ? object.error
        : "The request could not be completed.",
    );
  if (!object)
    throw new ApiError(
      502,
      "The server returned an invalid response. Please reload and try again.",
    );
  return body as T;
}
