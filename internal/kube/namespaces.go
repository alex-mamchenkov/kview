package kube

import (
	"context"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"kview/internal/cluster"
)

type NamespaceDTO struct {
	Name string `json:"name"`
}

func ListNamespaces(ctx context.Context, c *cluster.Clients) ([]NamespaceDTO, error) {
	nsList, err := c.Clientset.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	out := make([]NamespaceDTO, 0, len(nsList.Items))
	for _, ns := range nsList.Items {
		out = append(out, NamespaceDTO{Name: ns.Name})
	}
	return out, nil
}

func ListNamespacesFallback(ctx context.Context, c *cluster.Clients) ([]NamespaceDTO, error) {
	// Fallback strategy placeholder:
	// - some restricted users can't list namespaces at all
	// - later we can keep "recent namespaces" and allow manual input in UI
	_ = v1.Namespace{}
	return []NamespaceDTO{}, nil
}

