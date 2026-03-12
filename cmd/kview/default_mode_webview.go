//go:build webview

package main

import "kview/internal/launcher"

// For webview builds, prefer webview as the default launcher mode when --mode is not set.
var defaultMode = launcher.ModeWebview

