import React, { useMemo, useState } from "react";
import {
  Box,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Autocomplete,
  IconButton,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import type { Section } from "../state";

type Props = {
  contexts: any[];
  activeContext: string;
  onSelectContext: (name: string) => void;

  namespaces: string[];
  namespace: string;
  onSelectNamespace: (ns: string) => void;
  nsLimited: boolean;

  favourites: string[];
  onToggleFavourite: (ns: string) => void;

  section: Section;
  onSelectSection: (s: Section) => void;
};

const drawerWidth = 320;

export default function Sidebar(props: Props) {
  const [nsInput, setNsInput] = useState("");
  const isClusterScoped =
    props.section === "nodes" || props.section === "namespaces" || props.section === "persistentvolumes";

  const favSet = useMemo(() => new Set(props.favourites), [props.favourites]);

  const sortedNamespaces = useMemo(() => {
    const fav = props.namespaces.filter((n) => favSet.has(n)).sort((a, b) => a.localeCompare(b));
    const rest = props.namespaces.filter((n) => !favSet.has(n)).sort((a, b) => a.localeCompare(b));
    return [...fav, ...rest];
  }, [props.namespaces, favSet]);

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: "border-box", pt: 10, px: 2 },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="subtitle2">Cluster / Context</Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="ctx-label">Context</InputLabel>
          <Select
            labelId="ctx-label"
            label="Context"
            value={props.activeContext || ""}
            onChange={(e) => props.onSelectContext(String(e.target.value))}
          >
            {props.contexts.map((c) => (
              <MenuItem key={c.name} value={c.name}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Typography variant="subtitle2">Namespace</Typography>

        {isClusterScoped ? (
          <TextField
            size="small"
            label="Namespace"
            value="-"
            disabled
            helperText="Cluster-scoped resource"
          />
        ) : !props.nsLimited ? (
          <Autocomplete
            size="small"
            options={sortedNamespaces}
            value={props.namespace || null}
            inputValue={nsInput}
            onInputChange={(_, v) => setNsInput(v)}
            onChange={(_, v) => props.onSelectNamespace(v || "")}
            renderInput={(params) => <TextField {...params} label="Namespace" />}
            renderOption={(optionProps, option) => {
              const isFav = favSet.has(option);
              return (
                <li {...optionProps} key={option} style={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ flexGrow: 1 }}>{option}</Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      props.onToggleFavourite(option);
                    }}
                  >
                    {isFav ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                </li>
              );
            }}
            filterOptions={(opts, state) => {
              const q = state.inputValue.trim().toLowerCase();
              if (!q) return opts;
              return opts.filter((n) => n.toLowerCase().includes(q));
            }}
          />
        ) : (
          <TextField
            size="small"
            label="Namespace (manual)"
            value={props.namespace}
            onChange={(e) => props.onSelectNamespace(e.target.value)}
            helperText="No permission to list namespaces (RBAC). Type it manually."
          />
        )}

        <Divider />

        <Typography variant="subtitle2">Navigation</Typography>
        <List dense disablePadding>
          <ListItemButton selected={props.section === "nodes"} onClick={() => props.onSelectSection("nodes")}>
            <ListItemText primary="Nodes" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "namespaces"}
            onClick={() => props.onSelectSection("namespaces")}
          >
            <ListItemText primary="Namespaces" />
          </ListItemButton>
          <ListItemButton selected={props.section === "pods"} onClick={() => props.onSelectSection("pods")}>
            <ListItemText primary="Pods" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "deployments"}
            onClick={() => props.onSelectSection("deployments")}
          >
            <ListItemText primary="Deployments" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "daemonsets"}
            onClick={() => props.onSelectSection("daemonsets")}
          >
            <ListItemText primary="DaemonSets" />
          </ListItemButton>
        <ListItemButton
          selected={props.section === "statefulsets"}
          onClick={() => props.onSelectSection("statefulsets")}
        >
          <ListItemText primary="StatefulSets" />
        </ListItemButton>
          <ListItemButton
            selected={props.section === "replicasets"}
            onClick={() => props.onSelectSection("replicasets")}
          >
            <ListItemText primary="ReplicaSets" />
          </ListItemButton>
          <ListItemButton selected={props.section === "jobs"} onClick={() => props.onSelectSection("jobs")}>
            <ListItemText primary="Jobs" />
          </ListItemButton>
          <ListItemButton selected={props.section === "cronjobs"} onClick={() => props.onSelectSection("cronjobs")}>
            <ListItemText primary="CronJobs" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "services"}
            onClick={() => props.onSelectSection("services")}
          >
            <ListItemText primary="Services" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "ingresses"}
            onClick={() => props.onSelectSection("ingresses")}
          >
            <ListItemText primary="Ingresses" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "configmaps"}
            onClick={() => props.onSelectSection("configmaps")}
          >
            <ListItemText primary="ConfigMaps" />
          </ListItemButton>
          <ListItemButton selected={props.section === "secrets"} onClick={() => props.onSelectSection("secrets")}>
            <ListItemText primary="Secrets" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "persistentvolumes"}
            onClick={() => props.onSelectSection("persistentvolumes")}
          >
            <ListItemText primary="PersistentVolumes" />
          </ListItemButton>
          <ListItemButton
            selected={props.section === "persistentvolumeclaims"}
            onClick={() => props.onSelectSection("persistentvolumeclaims")}
          >
            <ListItemText primary="PersistentVolumeClaims" />
          </ListItemButton>
          <ListItemButton selected={props.section === "helm"} onClick={() => props.onSelectSection("helm")} disabled>
            <ListItemText primary="Helm Releases" secondary="soon" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
}

