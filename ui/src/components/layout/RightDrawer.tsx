import React from "react";
import { Drawer, type DrawerProps } from "@mui/material";

type Props = DrawerProps;

export default function RightDrawer(props: Props) {
  const { PaperProps, ModalProps, ...rest } = props;

  return (
    <Drawer
      anchor="right"
      {...rest}
      ModalProps={{
        // Allow focus to move from an opened drawer to Activity Panel xterm.
        disableEnforceFocus: true,
        disableAutoFocus: true,
        disableRestoreFocus: true,
        ...ModalProps,
      }}
      PaperProps={{
        sx: {
          // AppBar is 64px (mt: 8), keep drawer below it.
          // Subtract dynamic bottom panel offset; when panel is collapsed this is small,
          // when expanded it is larger, so the drawer never hides behind it.
          mt: 8,
          height: "calc(100% - 64px - var(--bottom-panel-offset, 0px))",
          borderTopLeftRadius: 8,
          borderBottomLeftRadius: 8,
          ...(PaperProps?.sx || {}),
        },
        ...PaperProps,
      }}
    />
  );
}

