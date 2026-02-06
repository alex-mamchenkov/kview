package kube

import (
	"context"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"kview/internal/cluster"
)

type EventDTO struct {
	Type      string `json:"type"`
	Reason    string `json:"reason"`
	Message   string `json:"message"`
	Count     int32  `json:"count"`
	FirstSeen int64  `json:"firstSeen"`
	LastSeen  int64  `json:"lastSeen"`
}

func ListEventsForPod(ctx context.Context, c *cluster.Clients, namespace, podName string) ([]EventDTO, error) {
	return ListEventsForObject(ctx, c, namespace, "Pod", podName)
}

type EventBriefDTO struct {
	Type     string `json:"type"`
	Reason   string `json:"reason"`
	LastSeen int64  `json:"lastSeen"`
}

func LatestEventsByObject(ctx context.Context, c *cluster.Clients, namespace, kind string) (map[string]EventBriefDTO, error) {
	evs, err := c.Clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	out := make(map[string]EventBriefDTO)
	for _, e := range evs.Items {
		evKind := strings.TrimSpace(e.InvolvedObject.Kind)
		evName := strings.TrimSpace(e.InvolvedObject.Name)
		if evKind != kind || evName == "" {
			continue
		}

		last := eventLastSeen(e)
		prev, ok := out[evName]
		if !ok || last.Unix() > prev.LastSeen {
			out[evName] = EventBriefDTO{
				Type:     e.Type,
				Reason:   e.Reason,
				LastSeen: last.Unix(),
			}
		}
	}
	return out, nil
}

func ListEventsForObject(ctx context.Context, c *cluster.Clients, namespace, kind, name string) ([]EventDTO, error) {
	// Attempt 1: fieldSelector (fast)
	selector := "involvedObject.kind=" + kind + ",involvedObject.name=" + name
	evs, err := c.Clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{
		FieldSelector: selector,
	})
	if err == nil && len(evs.Items) > 0 {
		return mapAndSortEvents(evs.Items), nil
	}

	// Attempt 2: fallback list all in namespace and filter
	all, err2 := c.Clientset.CoreV1().Events(namespace).List(ctx, metav1.ListOptions{})
	if err2 != nil {
		// If attempt 1 had an error, return that; else return attempt 2 error
		if err != nil {
			return nil, err
		}
		return nil, err2
	}

	out := make([]EventDTO, 0)
	for _, e := range all.Items {
		evKind := strings.TrimSpace(e.InvolvedObject.Kind)
		evName := strings.TrimSpace(e.InvolvedObject.Name)
		if evKind == kind && evName == name {
			out = append(out, toDTO(e))
		}
	}

	sort.Slice(out, func(i, j int) bool { return out[i].LastSeen > out[j].LastSeen })
	return out, nil
}

func mapAndSortEvents(items []corev1.Event) []EventDTO {
	out := make([]EventDTO, 0, len(items))
	for _, e := range items {
		out = append(out, toDTO(e))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].LastSeen > out[j].LastSeen })
	return out
}

func toDTO(e corev1.Event) EventDTO {
	first := eventFirstSeen(e)
	last := eventLastSeen(e)

	return EventDTO{
		Type:      e.Type,
		Reason:    e.Reason,
		Message:   e.Message,
		Count:     e.Count,
		FirstSeen: first.Unix(),
		LastSeen:  last.Unix(),
	}
}

func eventFirstSeen(e corev1.Event) time.Time {
	first := e.FirstTimestamp.Time
	if first.IsZero() {
		first = e.CreationTimestamp.Time
	}
	if first.IsZero() {
		first = time.Now()
	}
	return first
}

func eventLastSeen(e corev1.Event) time.Time {
	last := e.LastTimestamp.Time
	if last.IsZero() {
		last = e.CreationTimestamp.Time
	}
	if last.IsZero() {
		last = time.Now()
	}
	return last
}

