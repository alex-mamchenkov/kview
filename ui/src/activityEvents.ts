export const OPEN_TERMINAL_SESSION_EVENT = "kview:open-terminal-session";
export const FOCUS_SESSIONS_TAB_EVENT = "kview:focus-sessions-tab";

export type OpenTerminalSessionEventDetail = {
  sessionId: string;
  source?: string;
  namespace?: string;
  pod?: string;
  container?: string;
};

export function emitOpenTerminalSession(detail: OpenTerminalSessionEventDetail) {
  window.dispatchEvent(
    new CustomEvent<OpenTerminalSessionEventDetail>(OPEN_TERMINAL_SESSION_EVENT, {
      detail,
    })
  );
}

export function emitFocusSessionsTab() {
  window.dispatchEvent(new CustomEvent(FOCUS_SESSIONS_TAB_EVENT));
}
