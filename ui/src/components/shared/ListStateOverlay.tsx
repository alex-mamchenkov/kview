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
};

export default function ListStateOverlay({ error, emptyMessage, resourceLabel }: ListStateOverlayProps) {
  const isAccessDenied = error?.status === 401 || error?.status === 403;
  return (
    <GridOverlay sx={{ p: 2, alignItems: "flex-start", justifyContent: "flex-start" }}>
      <Box sx={{ maxWidth: 520 }}>
        {error ? (
          isAccessDenied ? (
            <AccessDeniedState status={error.status} resourceLabel={resourceLabel} />
          ) : (
            <ErrorState message={error.message} />
          )
        ) : (
          <EmptyState message={emptyMessage} />
        )}
      </Box>
    </GridOverlay>
  );
}
