import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { requestConnectionRetry, useConnectionState } from "../../connectionState";

export default function ConnectionBanner() {
  const { health, activeIssue } = useConnectionState();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    setDismissedId(null);
  }, [activeIssue?.id]);

  if (health !== "unhealthy" || !activeIssue || dismissedId === activeIssue.id) {
    return null;
  }

  const title = activeIssue.kind === "backend" ? "Backend unreachable" : "Refresh failed";
  const description =
    activeIssue.kind === "backend"
      ? "The UI cannot reach the kview backend. We'll keep retrying in the background."
      : "The latest refresh failed. We'll keep retrying in the background.";

  return (
    <Box sx={{ mb: 1 }}>
      <Alert
        severity="error"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button color="inherit" size="small" onClick={() => requestConnectionRetry()}>
              Retry now
            </Button>
            <Button color="inherit" size="small" onClick={() => setDismissedId(activeIssue.id)}>
              Dismiss
            </Button>
          </Box>
        }
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Alert>
    </Box>
  );
}
