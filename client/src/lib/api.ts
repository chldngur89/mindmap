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
