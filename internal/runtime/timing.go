package runtime

import (
	"context"
	"sort"
	"time"
)

// WithDerivedTiming returns a shallow copy of a with ExecutionMs set from wall clock:
// start = StartedAt if non-zero, else CreatedAt; end = UpdatedAt for terminal states, else time.Now().UTC().
func WithDerivedTiming(a Activity) Activity {
	start := a.CreatedAt
	if !a.StartedAt.IsZero() {
		start = a.StartedAt
	}
	if start.IsZero() {
		return a
	}
	now := time.Now().UTC()
	end := now
	switch a.Status {
	case ActivityStatusStopped, ActivityStatusFailed:
		if !a.UpdatedAt.IsZero() {
			end = a.UpdatedAt
		}
	}
	if end.Before(start) {
		end = start
	}
	a.ExecutionMs = end.Sub(start).Milliseconds()
	return a
}

// ListActivitiesSorted returns registry items with derived timing, newest UpdatedAt first.
func ListActivitiesSorted(ctx context.Context, reg ActivityRegistry) ([]Activity, error) {
	items, err := reg.List(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]Activity, 0, len(items))
	for _, a := range items {
		out = append(out, WithDerivedTiming(a))
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].UpdatedAt.After(out[j].UpdatedAt)
	})
	return out, nil
}

// ScheduleActivityTTLRemoval removes a finished activity after ttl if it was not updated since marker.
func ScheduleActivityTTLRemoval(reg ActivityRegistry, id string, updatedMarker time.Time, ttl time.Duration) {
	if reg == nil || id == "" || ttl <= 0 {
		return
	}
	go func() {
		time.Sleep(ttl)
		act, ok, _ := reg.Get(context.Background(), id)
		if !ok {
			return
		}
		if !act.UpdatedAt.Equal(updatedMarker) {
			return
		}
		if act.Status != ActivityStatusStopped && act.Status != ActivityStatusFailed {
			return
		}
		_ = reg.Remove(context.Background(), id)
	}()
}
