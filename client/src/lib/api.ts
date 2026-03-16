const API_TIMEOUT_MS = 12000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        `Request timed out after ${API_TIMEOUT_MS / 1000}s. Check Vercel Functions logs and your Supabase URL/key.`,
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = await response.json().catch(() => null);
  const message =
    body && typeof body === "object"
      ? (body.error ?? body.message ?? fallback)
      : fallback;
  const debug =
    body &&
    typeof body === "object" &&
    "debug" in body &&
    body.debug
      ? ` (env: ${JSON.stringify(body.debug)})`
      : "";

  return `${String(message)}${debug}`;
}
