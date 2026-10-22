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

  const response = await fetch(path, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string> | undefined) },
    body,
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : await response.text();

  if (!response.ok) {
    const errorPayload = payload as { error?: { code?: string; message?: string; details?: Array<{ path: string; message: string }> } } | null;
    throw new ApiError(
      response.status,
      errorPayload?.error?.code ?? "request_failed",
      errorPayload?.error?.message ?? "Something went wrong. Please try again.",
      errorPayload?.error?.details ?? [],
    );
  }
  return payload as T;
}
