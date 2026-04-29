package dataplane

import "context"

// Well-known dataplane work source labels for scheduler / live work UI (HTTP handlers may set via context).
const (
	WorkSourceAPI         = "api" // default: list/detail HTTP handlers
	WorkSourceObserver    = "observer"
	WorkSourceEnrichment  = "enrichment"
	WorkSourceAllContexts = "all-context-enrichment"
	WorkSourceDashboard   = "dashboard"
	WorkSourceProjection  = "projection" // namespace summary / drawer-led projections
)

type workSourceKey struct{}

// ContextWithWorkSource attaches a source label for scheduler live-work reporting.
func ContextWithWorkSource(ctx context.Context, source string) context.Context {
	if source == "" {
		return ctx
	}
	return context.WithValue(ctx, workSourceKey{}, source)
}

// ContextWithWorkSourceIfUnset sets source only when none is already present.
func ContextWithWorkSourceIfUnset(ctx context.Context, source string) context.Context {
	if WorkSourceFromContext(ctx) != "" {
		return ctx
	}
	return ContextWithWorkSource(ctx, source)
}

// WorkSourceFromContext returns the work source label or empty string.
func WorkSourceFromContext(ctx context.Context) string {
	if ctx == nil {
		return ""
	}
	v, _ := ctx.Value(workSourceKey{}).(string)
	return v
}

func workSourceOrAPI(ctx context.Context) string {
	s := WorkSourceFromContext(ctx)
	if s == "" {
		return WorkSourceAPI
	}
	return s
}
