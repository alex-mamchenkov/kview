import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  TextField,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import { apiPostWithContext, toApiError } from "../api";
import { useActiveContext } from "../activeContext";

// --- Uninstall / Upgrade buttons for a selected release ---

type ReleaseActionsProps = {
  token: string;
  namespace: string;
  releaseName: string;
  onRefresh: () => void;
  onDeleted: () => void;
};

export function HelmReleaseActions({
  token,
  namespace,
  releaseName,
  onRefresh,
  onDeleted,
}: ReleaseActionsProps) {
  const activeContext = useActiveContext();
  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [reinstallOpen, setReinstallOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
      <Button size="small" variant="outlined" onClick={() => setReinstallOpen(true)}>
        Reinstall
      </Button>
      <Button size="small" variant="outlined" onClick={() => setUpgradeOpen(true)}>
        Upgrade
      </Button>
      <Button
        size="small"
        variant="outlined"
        color="error"
        onClick={() => setUninstallOpen(true)}
      >
        Uninstall
      </Button>

      <ReinstallDialog
        open={reinstallOpen}
        onClose={() => setReinstallOpen(false)}
        token={token}
        activeContext={activeContext}
        namespace={namespace}
        releaseName={releaseName}
        onSuccess={() => {
          setReinstallOpen(false);
          onRefresh();
        }}
      />
      <UninstallDialog
        open={uninstallOpen}
        onClose={() => setUninstallOpen(false)}
        token={token}
        activeContext={activeContext}
        namespace={namespace}
        releaseName={releaseName}
        onSuccess={() => {
          setUninstallOpen(false);
          onDeleted();
        }}
      />
      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        token={token}
        activeContext={activeContext}
        namespace={namespace}
        releaseName={releaseName}
        onSuccess={() => {
          setUpgradeOpen(false);
          onRefresh();
        }}
      />
    </Box>
  );
}

// --- Install button for the releases list page ---

type InstallButtonProps = {
  token: string;
  namespace: string;
  onSuccess: () => void;
};

export function HelmInstallButton({ token, namespace, onSuccess }: InstallButtonProps) {
  const activeContext = useActiveContext();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="small" variant="contained" onClick={() => setOpen(true)}>
        Install
      </Button>
      <InstallDialog
        open={open}
        onClose={() => setOpen(false)}
        token={token}
        activeContext={activeContext}
        defaultNamespace={namespace}
        onSuccess={() => {
          setOpen(false);
          onSuccess();
        }}
      />
    </>
  );
}

// --- Reinstall Dialog (simple confirm) ---

type ReinstallResult = {
  status: string;
  message?: string;
  details?: { applied?: number; skipped?: number };
};

function ReinstallDialog(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  activeContext: string;
  namespace: string;
  releaseName: string;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (props.open) {
      setError("");
      setSuccessMsg("");
    }
  }, [props.open]);

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      const res = await apiPostWithContext<{ context: string; result: ReinstallResult }>(
        "/api/helm/reinstall",
        props.token,
        props.activeContext,
        {
          namespace: props.namespace,
          release: props.releaseName,
        }
      );
      const result = res?.result;
      let msg = "Reinstall completed";
      if (result?.message) {
        msg = `Reinstall: ${result.message}`;
        const d = result.details;
        if (d && typeof d.applied === "number") {
          msg += ` (applied ${d.applied}, skipped ${d.skipped ?? 0})`;
        }
      }
      setSuccessMsg(msg);
      props.onSuccess();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Reinstall Helm Release</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Reinstall <strong>{props.releaseName}</strong> in namespace{" "}
            <strong>{props.namespace}</strong> using the currently installed chart and values?
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={busy} variant="contained">
            {busy ? <CircularProgress size={20} /> : "Reinstall"}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!successMsg}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setSuccessMsg("")}>
          {successMsg}
        </Alert>
      </Snackbar>
    </>
  );
}

// --- Uninstall Dialog (typed confirmation) ---

function UninstallDialog(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  activeContext: string;
  namespace: string;
  releaseName: string;
  onSuccess: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (props.open) {
      setConfirmText("");
      setError("");
    }
  }, [props.open]);

  const confirmed = confirmText === props.releaseName;

  async function handleConfirm() {
    if (!confirmed) return;
    setBusy(true);
    setError("");
    try {
      await apiPostWithContext("/api/helm/uninstall", props.token, props.activeContext, {
        namespace: props.namespace,
        release: props.releaseName,
        keepHistory: false,
      });
      props.onSuccess();
    } catch (e) {
      const apiErr = toApiError(e);
      if (apiErr.status === 404) {
        props.onSuccess();
        return;
      }
      setError(apiErr.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Uninstall Helm Release</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This action is destructive and cannot be undone.
        </Alert>
        <Typography variant="body2" sx={{ mb: 2 }}>
          To confirm, type the release name: <strong>{props.releaseName}</strong>
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Release name"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          disabled={busy}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!confirmed || busy}
          variant="contained"
          color="error"
        >
          {busy ? <CircularProgress size={20} /> : "Uninstall"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Upgrade Dialog ---

function UpgradeDialog(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  activeContext: string;
  namespace: string;
  releaseName: string;
  onSuccess: () => void;
}) {
  const [chart, setChart] = useState("");
  const [version, setVersion] = useState("");
  const [valuesYaml, setValuesYaml] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (props.open) {
      setChart("");
      setVersion("");
      setValuesYaml("");
      setError("");
    }
  }, [props.open]);

  const valid = chart.trim() !== "";

  async function handleConfirm() {
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      await apiPostWithContext("/api/helm/upgrade", props.token, props.activeContext, {
        namespace: props.namespace,
        release: props.releaseName,
        chart: chart.trim(),
        version: version.trim(),
        valuesYaml,
      });
      props.onSuccess();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upgrade Helm Release</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Upgrade <strong>{props.releaseName}</strong> in namespace{" "}
          <strong>{props.namespace}</strong>
        </Typography>
        <TextField
          autoFocus
          fullWidth
          label="Chart"
          placeholder="repo/chart or ./path"
          value={chart}
          onChange={(e) => setChart(e.target.value)}
          disabled={busy}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Version (optional)"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={busy}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Values YAML (optional)"
          multiline
          minRows={4}
          maxRows={12}
          value={valuesYaml}
          onChange={(e) => setValuesYaml(e.target.value)}
          disabled={busy}
          InputProps={{ sx: { fontFamily: "monospace", fontSize: "0.85rem" } }}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!valid || busy} variant="contained">
          {busy ? <CircularProgress size={20} /> : "Upgrade"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// --- Install Dialog ---

function InstallDialog(props: {
  open: boolean;
  onClose: () => void;
  token: string;
  activeContext: string;
  defaultNamespace: string;
  onSuccess: () => void;
}) {
  const [namespace, setNamespace] = useState(props.defaultNamespace);
  const [release, setRelease] = useState("");
  const [chart, setChart] = useState("");
  const [version, setVersion] = useState("");
  const [valuesYaml, setValuesYaml] = useState("");
  const [createNamespace, setCreateNamespace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (props.open) {
      setNamespace(props.defaultNamespace);
      setRelease("");
      setChart("");
      setVersion("");
      setValuesYaml("");
      setCreateNamespace(false);
      setError("");
    }
  }, [props.open, props.defaultNamespace]);

  const valid = namespace.trim() !== "" && release.trim() !== "" && chart.trim() !== "";

  async function handleConfirm() {
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      await apiPostWithContext("/api/helm/install", props.token, props.activeContext, {
        namespace: namespace.trim(),
        release: release.trim(),
        chart: chart.trim(),
        version: version.trim(),
        valuesYaml,
        createNamespace,
      });
      props.onSuccess();
    } catch (e) {
      setError(toApiError(e).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Install Helm Release</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          label="Namespace"
          value={namespace}
          onChange={(e) => setNamespace(e.target.value)}
          disabled={busy}
          sx={{ mb: 2, mt: 1 }}
        />
        <TextField
          fullWidth
          label="Release name"
          value={release}
          onChange={(e) => setRelease(e.target.value)}
          disabled={busy}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Chart"
          placeholder="repo/chart or ./path"
          value={chart}
          onChange={(e) => setChart(e.target.value)}
          disabled={busy}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Version (optional)"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          disabled={busy}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Values YAML (optional)"
          multiline
          minRows={4}
          maxRows={12}
          value={valuesYaml}
          onChange={(e) => setValuesYaml(e.target.value)}
          disabled={busy}
          InputProps={{ sx: { fontFamily: "monospace", fontSize: "0.85rem" } }}
          sx={{ mb: 1 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={createNamespace}
              onChange={(e) => setCreateNamespace(e.target.checked)}
              disabled={busy}
            />
          }
          label="Create namespace if it does not exist"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={!valid || busy} variant="contained">
          {busy ? <CircularProgress size={20} /> : "Install"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
