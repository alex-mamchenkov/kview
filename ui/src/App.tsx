import React, { useEffect, useMemo, useState } from "react";
import { Box, CssBaseline, AppBar, Toolbar, Typography } from "@mui/material";
import Sidebar from "./components/Sidebar";
import PodsTable from "./components/PodsTable";
import DeploymentsTable from "./components/DeploymentsTable";
import ReplicaSetsTable from "./components/ReplicaSetsTable";
import ServicesTable from "./components/ServicesTable";
import IngressesTable from "./components/IngressesTable";
import { apiGet, apiPost } from "./api";
import { loadState, saveState, toggleFavouriteNamespace, type Section } from "./state";

function getToken(): string {
  const u = new URL(window.location.href);
  return u.searchParams.get("token") || "";
}

export default function App() {
  const token = useMemo(() => getToken(), []);
  const [contexts, setContexts] = useState<any[]>([]);
  const [activeContext, setActiveContext] = useState<string>("");

  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [nsLimited, setNsLimited] = useState<boolean>(false);
  const [namespace, setNamespace] = useState<string>("");

  const [section, setSection] = useState<Section>("pods");

  const [favourites, setFavourites] = useState<string[]>([]);

  // load from localStorage once
  const [appState, setAppState] = useState(() => loadState());

  // persist on change
  useEffect(() => {
    saveState(appState);
  }, [appState]);

  // initial bootstrap
  useEffect(() => {
    (async () => {
      // 1) contexts
      const ctxRes = await apiGet<any>("/api/contexts", token);
      const ctxs = ctxRes.contexts || [];
      setContexts(ctxs);

      const stateCtx = appState.activeContext;
      const ctxExists = stateCtx && ctxs.some((c: any) => c.name === stateCtx);
      const chosenCtx = ctxExists ? stateCtx : (ctxs[0]?.name || "");

      if (chosenCtx) {
        await apiPost("/api/context/select", token, { name: chosenCtx });
      }
      setActiveContext(chosenCtx);

      // 2) namespaces
      const nsRes = await apiGet<any>("/api/namespaces", token);
      const limited = !!nsRes.limited;
      setNsLimited(limited);

      const nsItems = (nsRes.items || []).map((x: any) => x.name);
      setNamespaces(nsItems);

      // 3) pick namespace
      let chosenNs = appState.activeNamespace || "";
      if (!limited) {
        if (!chosenNs || !nsItems.includes(chosenNs)) {
          chosenNs = nsItems[0] || "";
        }
      } else {
        // limited mode: keep what user had or blank
        chosenNs = chosenNs || "";
      }
      setNamespace(chosenNs);

      // 4) section
      setSection(appState.activeSection || "pods");

      // 5) favourites for this ctx
      const fav = (appState.favouriteNamespacesByContext[chosenCtx] || []).slice();
      setFavourites(fav);

      // update stored state if we auto-picked
      setAppState((s) => ({
        ...s,
        activeContext: chosenCtx || s.activeContext,
        activeNamespace: chosenNs || s.activeNamespace,
        activeSection: s.activeSection || "pods",
      }));
    })().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSelectContext(name: string) {
    await apiPost("/api/context/select", token, { name });
    setActiveContext(name);

    // refresh namespaces for new context
    const nsRes = await apiGet<any>("/api/namespaces", token);
    const limited = !!nsRes.limited;
    setNsLimited(limited);

    const nsItems = (nsRes.items || []).map((x: any) => x.name);
    setNamespaces(nsItems);

    // pick namespace from state if possible
    let chosenNs = appState.activeNamespace || "";
    if (!limited) {
      if (!chosenNs || !nsItems.includes(chosenNs)) chosenNs = nsItems[0] || "";
    }
    setNamespace(chosenNs);

    // load favourites for this context
    const fav = (appState.favouriteNamespacesByContext[name] || []).slice();
    setFavourites(fav);

    setAppState((s) => ({ ...s, activeContext: name, activeNamespace: chosenNs }));
  }

  function onSelectNamespace(ns: string) {
    setNamespace(ns);
    setAppState((s) => ({ ...s, activeNamespace: ns }));
  }

  function onToggleFavourite(ns: string) {
    if (!activeContext) return;
    setAppState((s) => {
      const next = toggleFavouriteNamespace(s, activeContext, ns);
      setFavourites(next.favouriteNamespacesByContext[activeContext] || []);
      return next;
    });
  }

  function onSelectSection(sec: Section) {
    setSection(sec);
    setAppState((s) => ({ ...s, activeSection: sec }));
  }

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            kview — {activeContext || "no context"}
          </Typography>
        </Toolbar>
      </AppBar>

      <Sidebar
        contexts={contexts}
        activeContext={activeContext}
        onSelectContext={onSelectContext}
        namespaces={namespaces}
        namespace={namespace}
        onSelectNamespace={onSelectNamespace}
        nsLimited={nsLimited}
        favourites={favourites}
        onToggleFavourite={onToggleFavourite}
        section={section}
        onSelectSection={onSelectSection}
      />

      <Box component="main" sx={{ flexGrow: 1, p: 2, mt: 8 }}>
        {section === "pods" && namespace ? <PodsTable token={token} namespace={namespace} /> : null}
        {section === "deployments" && namespace ? (
          <DeploymentsTable token={token} namespace={namespace} />
        ) : null}
        {section === "replicasets" && namespace ? (
          <ReplicaSetsTable token={token} namespace={namespace} />
        ) : null}
        {section === "services" && namespace ? <ServicesTable token={token} namespace={namespace} /> : null}
        {section === "ingresses" && namespace ? <IngressesTable token={token} namespace={namespace} /> : null}
        {/* later: jobs */}
      </Box>
    </Box>
  );
}

