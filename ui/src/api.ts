export type ContextInfo = {
  name: string;
  cluster: string;
  authInfo: string;
  namespace?: string;
};

export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path + (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token));
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

export async function apiPost<T>(path: string, token: string, body: any): Promise<T> {
  const res = await fetch(path + (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

