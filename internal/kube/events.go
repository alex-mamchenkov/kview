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
	// Attempt 1: fieldSelector (fast)
	selector := "involvedObject.kind=Pod,involvedObject.name=" + podName
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
		kind := strings.TrimSpace(e.InvolvedObject.Kind)
		name := strings.TrimSpace(e.InvolvedObject.Name)
		if kind == "Pod" && name == podName {
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
	first := e.FirstTimestamp.Time
	last := e.LastTimestamp.Time

	// Some clusters may not set these; fallback to creation time.
	if first.IsZero() {
		first = e.CreationTimestamp.Time
	}
	if last.IsZero() {
		last = e.CreationTimestamp.Time
	}

	// If still zero, use now-ish (avoid 1970)
	if first.IsZero() {
		first = time.Now()
	}
	if last.IsZero() {
		last = time.Now()
	}

	return EventDTO{
		Type:      e.Type,
		Reason:    e.Reason,
		Message:   e.Message,
		Count:     e.Count,
		FirstSeen: first.Unix(),
		LastSeen:  last.Unix(),
	}
}

