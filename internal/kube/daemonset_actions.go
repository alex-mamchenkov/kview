package kube

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"kview/internal/cluster"
)

func validateDaemonSetTarget(req ActionRequest) error {
	if req.Group != "apps" {
		return fmt.Errorf("unsupported group %q, expected \"apps\"", req.Group)
	}
	if req.Resource != "daemonsets" {
		return fmt.Errorf("unsupported resource %q, expected \"daemonsets\"", req.Resource)
	}
	if req.Namespace == "" {
		return fmt.Errorf("namespace is required")
	}
	if req.Name == "" {
		return fmt.Errorf("name is required")
	}
	return nil
}

// HandleDaemonSetRestart performs a rollout restart by patching the pod template annotation.
func HandleDaemonSetRestart(ctx context.Context, c *cluster.Clients, req ActionRequest) (*ActionResult, error) {
	if err := validateDaemonSetTarget(req); err != nil {
		return &ActionResult{Status: "error", Message: err.Error()}, nil
	}

	restartedAt := time.Now().UTC().Format(time.RFC3339)

	patch, _ := json.Marshal(map[string]any{
		"spec": map[string]any{
			"template": map[string]any{
				"metadata": map[string]any{
					"annotations": map[string]any{
						"kubectl.kubernetes.io/restartedAt": restartedAt,
					},
				},
			},
		},
	})

	_, err := c.Clientset.AppsV1().DaemonSets(req.Namespace).Patch(
		ctx, req.Name, types.MergePatchType, patch, metav1.PatchOptions{},
	)
	if err != nil {
		return nil, err
	}

	return &ActionResult{
		Status:  "ok",
		Message: fmt.Sprintf("Restarted %s/%s", req.Namespace, req.Name),
		Details: map[string]any{
			"namespace":   req.Namespace,
			"name":        req.Name,
			"restartedAt": restartedAt,
		},
	}, nil
}

// HandleDaemonSetDelete deletes the daemonset.
func HandleDaemonSetDelete(ctx context.Context, c *cluster.Clients, req ActionRequest) (*ActionResult, error) {
	return handleNamespacedDelete(ctx, req, "apps", "daemonsets", "daemonset",
		func(ctx context.Context, ns, name string, opts metav1.DeleteOptions) error {
			return c.Clientset.AppsV1().DaemonSets(ns).Delete(ctx, name, opts)
		},
	)
}
