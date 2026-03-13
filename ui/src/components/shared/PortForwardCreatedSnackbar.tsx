import React from "react";
import { Alert, Snackbar } from "@mui/material";

type Props = {
  open: boolean;
  message: string;
  onClose: () => void;
};

export default function PortForwardCreatedSnackbar({ open, message, onClose }: Props) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert severity="success" variant="filled" onClose={onClose}>
        {message}
      </Alert>
    </Snackbar>
  );
}
