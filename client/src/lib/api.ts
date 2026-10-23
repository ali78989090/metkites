export class ApiError extends Error {
  status: number;
  code: string;
  details: Array<{ path: string; message: string }>;

  constructor(status: number, code: string, message: string, details: Array<{ path: string; message: string }> = []) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** First validation message for a form field, if any. */
  fieldError(path: string): string | undefined {
    return this.details.find((issue) => issue.path === path || issue.path.startsWith(`${path}.`))?.message;
  }

  get fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of this.details) {
      if (!out[issue.path]) out[issue.path] = issue.message;
    }
    return out;
  }
}

type UnauthorizedHandler = (path: string, error: ApiError) => void;
let unauthorizedListener: UnauthorizedHandler | null = null;

export function registerUnauthorizedHandler(fn: UnauthorizedHandler): () => void {
  unauthorizedListener = fn;
  return () => {
    if (unauthorizedListener === fn) unauthorizedListener = null;
  };
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  formData?: FormData;
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
      body,
      credentials: "include",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw err;
    }
    throw new ApiError(0, "network_error", "Unable to connect to the server. Please check your internet connection.");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const errorPayload = payload as { error?: { code?: string; message?: string; details?: Array<{ path: string; message: string }> } } | null;
    const error = new ApiError(
      response.status,
      errorPayload?.error?.code ?? (response.status === 401 ? "unauthorized" : response.status === 403 ? "forbidden" : "request_failed"),
      errorPayload?.error?.message ?? (response.status === 401 ? "Session expired or authentication required." : "Something went wrong. Please try again."),
      errorPayload?.error?.details ?? [],
    );

    // If an authenticated endpoint returns 401 (excluding deliberate login attempts), trigger the handler
    if (response.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/register")) {
      unauthorizedListener?.(path, error);
    }

    throw error;
  }
  return payload as T;
}
