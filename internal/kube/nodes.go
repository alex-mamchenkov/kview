package kube

import (
	"context"
	"sort"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

func ListNodes(ctx context.Context, c *cluster.Clients) ([]dto.NodeListItemDTO, error) {
	nodes, err := c.Clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	podCounts := map[string]int{}
	if pods, err := c.Clientset.CoreV1().Pods("").List(ctx, metav1.ListOptions{}); err == nil {
		for _, p := range pods.Items {
			if p.Spec.NodeName == "" {
				continue
			}
			podCounts[p.Spec.NodeName]++
		}
	}

	now := time.Now()
	out := make([]dto.NodeListItemDTO, 0, len(nodes.Items))
	for _, n := range nodes.Items {
		age := int64(0)
		if !n.CreationTimestamp.IsZero() {
			age = int64(now.Sub(n.CreationTimestamp.Time).Seconds())
		}

		out = append(out, dto.NodeListItemDTO{
			Name:              n.Name,
			Status:            nodeReadyStatus(n.Status.Conditions),
			Roles:             deriveNodeRoles(n.Labels),
			CPUAllocatable:    quantityString(n.Status.Allocatable[corev1.ResourceCPU]),
			MemoryAllocatable: quantityString(n.Status.Allocatable[corev1.ResourceMemory]),
			PodsAllocatable:   quantityString(n.Status.Allocatable[corev1.ResourcePods]),
			PodsCount:         podCounts[n.Name],
			KubeletVersion:    n.Status.NodeInfo.KubeletVersion,
			AgeSec:            age,
		})
	}
	return out, nil
}

func nodeReadyStatus(conds []corev1.NodeCondition) string {
	for _, c := range conds {
		if c.Type != corev1.NodeReady {
			continue
		}
		switch c.Status {
		case corev1.ConditionTrue:
			return "Ready"
		case corev1.ConditionFalse:
			return "NotReady"
		case corev1.ConditionUnknown:
			return "Unknown"
		default:
			return "Unknown"
		}
	}
	return "Unknown"
}

func deriveNodeRoles(labels map[string]string) []string {
	if len(labels) == 0 {
		return nil
	}
	roleSet := map[string]struct{}{}
	for k, v := range labels {
		if strings.HasPrefix(k, "node-role.kubernetes.io/") {
			role := strings.TrimPrefix(k, "node-role.kubernetes.io/")
			if role != "" {
				roleSet[role] = struct{}{}
			}
			continue
		}
		if k == "kubernetes.io/role" && strings.TrimSpace(v) != "" {
			roleSet[strings.TrimSpace(v)] = struct{}{}
		}
	}
	if len(roleSet) == 0 {
		return nil
	}
	roles := make([]string, 0, len(roleSet))
	for r := range roleSet {
		roles = append(roles, r)
	}
	sort.Strings(roles)
	return roles
}
