const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export type ApiError = Error & { status?: number };

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "No fue posible completar la solicitud") as ApiError;
    error.status = response.status;
    throw error;
  }
  return body as T;
}
