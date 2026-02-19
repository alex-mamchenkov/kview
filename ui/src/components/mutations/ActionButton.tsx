import React from "react";
import { Button, Tooltip } from "@mui/material";
import { useMutationDialog } from "./useMutationDialog";
import type { MutationActionDescriptor, TargetRef } from "../../lib/actions/types";

export type ActionButtonProps = {
  descriptor: MutationActionDescriptor;
  targetRef: TargetRef;
  token: string;
  onSuccess?: () => void;
  /** Override the button label (defaults to descriptor.title). */
  label?: string;
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success" | "inherit";
  size?: "small" | "medium" | "large";
  variant?: "text" | "outlined" | "contained";
  /** When true, the button is rendered but disabled. */
  disabled?: boolean;
  /** Shown as a tooltip when disabled (e.g. "Not permitted by RBAC"). */
  disabledReason?: string;
};

/**
 * A thin declarative helper that opens the MutationDialog when clicked.
 *
 * Requires a MutationProvider ancestor.
 */
export default function ActionButton({
  descriptor,
  targetRef,
  token,
  onSuccess,
  label,
  color,
  size = "small",
  variant = "outlined",
  disabled = false,
  disabledReason,
}: ActionButtonProps) {
  const { open } = useMutationDialog();

  function handleClick() {
    open({ descriptor, targetRef, token, onSuccess });
  }

  return (
    <Tooltip title={disabled && disabledReason ? disabledReason : ""}>
      {/* span wrapper required so Tooltip works on a disabled button */}
      <span>
        <Button
          size={size}
          variant={variant}
          color={color}
          disabled={disabled}
          onClick={handleClick}
        >
          {label ?? descriptor.title}
        </Button>
      </span>
    </Tooltip>
  );
}
