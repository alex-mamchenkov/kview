export type ContextInfo = {
  name: string;
  cluster: string;
  authInfo: string;
  namespace?: string;
};

type ApiErrorShape = { status?: number; message: string };

function extractJsonMessage(payload: unknown): string | null {
  if (payload == null) return null;
  if (typeof payload === "string") return payload;
  if (typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const candidates = [
    record.message,
    record.error,
    record.detail,
    record.reason,
    record.status,
    record.statusMessage,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c;
  }
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message;
  }
  return null;
}

function stripHtml(input: string): string {
  const withoutTags = input.replace(/<[^>]*>/g, " ");
  return withoutTags.replace(/\s+/g, " ").trim();
}

async function parseErrorResponse(res: Response): Promise<ApiErrorShape> {
  const status = res.status || undefined;
  let text = "";
  try {
    text = await res.text();
  } catch {
    text = "";
  }
  const raw = text.trim();
  if (raw) {
    const looksJson =
      res.headers.get("content-type")?.includes("application/json") ||
      raw.startsWith("{") ||
      raw.startsWith("[");
    if (looksJson) {
      try {
        const parsed = JSON.parse(raw);
        const msg = extractJsonMessage(parsed);
        if (msg) return { status, message: msg };
      } catch {
        // fall through to raw handling
      }
    }
    const looksHtml = /<\s*html/i.test(raw) || /<!doctype/i.test(raw) || /<\s*body/i.test(raw);
    if (looksHtml) {
      const stripped = stripHtml(raw);
      if (stripped) return { status, message: stripped };
    }
    return { status, message: raw };
  }
  const fallback = res.statusText || String(res.status || "");
  return { status, message: fallback };
}

function toError(shape: ApiErrorShape): Error {
  const err = new Error(shape.message);
  (err as Error & { status?: number }).status = shape.status;
  return err;
}

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path + (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token));
  if (!res.ok) throw toError(await parseErrorResponse(res));
  return await res.json();
}

export async function apiPost<T>(path: string, token: string, body: any): Promise<T> {
  const res = await fetch(path + (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw toError(await parseErrorResponse(res));
  return await res.json();
}

