import React from "react";
import { Box } from "@mui/material";
import { GridOverlay } from "@mui/x-data-grid";
import type { ApiError } from "../../api";
import AccessDeniedState from "./AccessDeniedState";
import EmptyState from "./EmptyState";
import ErrorState from "./ErrorState";

type ListStateOverlayProps = {
  error: ApiError | null;
  emptyMessage: string;
  resourceLabel?: string;
  accessDenied?: boolean;
};

export default function ListStateOverlay({
  error,
  emptyMessage,
  resourceLabel,
  accessDenied,
}: ListStateOverlayProps) {
  const isAccessDenied = accessDenied || error?.status === 401 || error?.status === 403;
  const status = accessDenied ? 403 : error?.status;
  return (
    <GridOverlay sx={{ p: 2, alignItems: "flex-start", justifyContent: "flex-start" }}>
      <Box sx={{ maxWidth: 520 }}>
        {isAccessDenied ? (
          <AccessDeniedState status={status} resourceLabel={resourceLabel} />
        ) : error ? (
          <ErrorState message={error.message} />
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </Box>
    </GridOverlay>
  );
}
