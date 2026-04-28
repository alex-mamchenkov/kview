import React from "react";
import { Box, Typography } from "@mui/material";
import { fmtTimeAgo, valueOrDash } from "../../utils/format";
import { eventChipColor } from "../../utils/k8sUi";
import { panelBoxCompactSx } from "../../theme/sxTokens";
import ResourceLinkChip from "./ResourceLinkChip";
import ScopedCountChip from "./ScopedCountChip";
import StatusChip from "./StatusChip";

export type EventCardEvent = {
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  firstSeen?: number;
  lastSeen?: number;
  fieldPath?: string;
  involvedKind?: string;
  involvedName?: string;
};

type EventCardProps = {
  event: EventCardEvent;
  showTarget?: boolean;
  targetKind?: string;
  targetName?: string;
  targetLabel?: string;
  targetTitle?: string;
  onTargetClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  subResourceKind?: string;
  subResourceLabel?: string;
  onSubResourceClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
};

export default function EventCard({
  event,
  showTarget = false,
  targetKind,
  targetName,
  targetLabel,
  targetTitle,
  onTargetClick,
  subResourceKind = "Container",
  subResourceLabel,
  onSubResourceClick,
}: EventCardProps) {
  const type = event.type || "Unknown";
  const reason = valueOrDash(event.reason);
  const count = event.count ?? 0;
  const resourceKind = targetKind || event.involvedKind || "Resource";
  const resourceName = targetName || event.involvedName || targetLabel || "";
  const resourceTitle = targetTitle || [resourceKind, resourceName].filter(Boolean).join(": ");

  return (
    <Box sx={panelBoxCompactSx}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", minWidth: 0 }}>
          <StatusChip size="small" label={type} color={eventChipColor(type)} />
          <ScopedCountChip
            size="small"
            label={reason}
            count={`x${valueOrDash(count)}`}
            color={eventChipColor(type)}
            title={`${reason}: x${valueOrDash(count)}`}
          />
          {showTarget && resourceName ? (
            <ResourceLinkChip
              label={resourceKind}
              count={resourceName}
              onClick={onTargetClick}
              title={resourceTitle}
            />
          ) : null}
          {subResourceLabel ? (
            <ResourceLinkChip
              label={subResourceKind}
              count={subResourceLabel}
              onClick={onSubResourceClick}
              title={`${subResourceKind}: ${subResourceLabel}`}
            />
          ) : null}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, lineHeight: "24px" }}>
          {fmtTimeAgo(event.lastSeen)}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mt: 0.75 }}>
        {valueOrDash(event.message)}
      </Typography>
    </Box>
  );
}
