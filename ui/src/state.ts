export type Section = "pods" | "deployments" | "jobs" | "services" | "helm";

export type AppStateV1 = {
  v: 1;
  activeContext?: string;
  activeNamespace?: string;
  activeSection?: Section;
  favouriteNamespacesByContext: Record<string, string[]>;
};

const KEY = "kview.state.v1";

export function loadState(): AppStateV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { v: 1, favouriteNamespacesByContext: {} };
    }
    const parsed = JSON.parse(raw);
    if (parsed?.v !== 1) return { v: 1, favouriteNamespacesByContext: {} };
    if (!parsed.favouriteNamespacesByContext) parsed.favouriteNamespacesByContext = {};
    return parsed as AppStateV1;
  } catch {
    return { v: 1, favouriteNamespacesByContext: {} };
  }
}

export function saveState(s: AppStateV1) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function toggleFavouriteNamespace(state: AppStateV1, ctx: string, ns: string): AppStateV1 {
  const fav = new Set(state.favouriteNamespacesByContext[ctx] || []);
  if (fav.has(ns)) fav.delete(ns);
  else fav.add(ns);

  return {
    ...state,
    favouriteNamespacesByContext: {
      ...state.favouriteNamespacesByContext,
      [ctx]: Array.from(fav).sort((a, b) => a.localeCompare(b)),
    },
  };
}

