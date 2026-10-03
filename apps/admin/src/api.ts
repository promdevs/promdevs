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
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new ApiError(
      response.status,
      body.error || "The request could not be completed.",
    );
  return body as T;
}
