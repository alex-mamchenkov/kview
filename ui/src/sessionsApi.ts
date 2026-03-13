import { apiPost } from "./api";

export async function apiDelete(path: string, token: string): Promise<void> {
  // Reuse apiPost with an empty body for DELETE to inherit error handling and notifications.
  await fetch(path + (path.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token), {
    method: "DELETE",
  }).then(async (res) => {
    if (!res.ok) {
      // Let apiPost handle error classification and notifications.
      await apiPost(path, token, {}); // This will always fail but will parse and emit the right notifications.
    }
  });
}

type TerminalSessionRequest = {
  namespace: string;
  pod: string;
  container?: string;
  title?: string;
  shell?: string;
};

type TerminalSessionResponse = {
  item: {
    id: string;
  };
};

export async function createTerminalSession(req: TerminalSessionRequest, token: string): Promise<string> {
  const res = await apiPost<TerminalSessionResponse>("/api/sessions/terminal", token, req);
  return res.item.id;
}

