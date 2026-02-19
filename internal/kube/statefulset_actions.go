package kube

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	"kview/internal/cluster"
)

func validateStatefulSetTarget(req ActionRequest) error {
	if req.Group != "apps" {
		return fmt.Errorf("unsupported group %q, expected \"apps\"", req.Group)
	}
	if req.Resource != "statefulsets" {
		return fmt.Errorf("unsupported resource %q, expected \"statefulsets\"", req.Resource)
	}
	if req.Namespace == "" {
		return fmt.Errorf("namespace is required")
	}
	if req.Name == "" {
		return fmt.Errorf("name is required")
	}
	return nil
}

// HandleStatefulSetScale patches spec.replicas to the requested value.
func HandleStatefulSetScale(ctx context.Context, c *cluster.Clients, req ActionRequest) (*ActionResult, error) {
	if err := validateStatefulSetTarget(req); err != nil {
		return &ActionResult{Status: "error", Message: err.Error()}, nil
	}

	raw, ok := req.Params["replicas"]
	if !ok {
		return &ActionResult{Status: "error", Message: "params.replicas is required"}, nil
	}
	replicasFloat, ok := raw.(float64)
	if !ok {
		return &ActionResult{Status: "error", Message: "params.replicas must be a number"}, nil
	}
	if replicasFloat < 0 || replicasFloat != math.Trunc(replicasFloat) {
		return &ActionResult{Status: "error", Message: "params.replicas must be an integer >= 0"}, nil
	}
	replicas := int32(replicasFloat)

	patch, _ := json.Marshal(map[string]any{
		"spec": map[string]any{
			"replicas": replicas,
		},
	})

	_, err := c.Clientset.AppsV1().StatefulSets(req.Namespace).Patch(
		ctx, req.Name, types.MergePatchType, patch, metav1.PatchOptions{},
	)
	if err != nil {
		return nil, err
	}

	return &ActionResult{
		Status:  "ok",
		Message: fmt.Sprintf("Scaled %s/%s to %d replicas", req.Namespace, req.Name, replicas),
		Details: map[string]any{
			"namespace": req.Namespace,
			"name":      req.Name,
			"replicas":  replicas,
		},
	}, nil
}

// HandleStatefulSetRestart performs a rollout restart by patching the pod template annotation.
func HandleStatefulSetRestart(ctx context.Context, c *cluster.Clients, req ActionRequest) (*ActionResult, error) {
	if err := validateStatefulSetTarget(req); err != nil {
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

	_, err := c.Clientset.AppsV1().StatefulSets(req.Namespace).Patch(
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

// HandleStatefulSetDelete deletes the statefulset.
func HandleStatefulSetDelete(ctx context.Context, c *cluster.Clients, req ActionRequest) (*ActionResult, error) {
	if err := validateStatefulSetTarget(req); err != nil {
		return &ActionResult{Status: "error", Message: err.Error()}, nil
	}

	opts := metav1.DeleteOptions{}

	if raw, ok := req.Params["propagationPolicy"]; ok {
		policyStr, ok := raw.(string)
		if !ok {
			return &ActionResult{Status: "error", Message: "params.propagationPolicy must be a string"}, nil
		}
		switch policyStr {
		case "Foreground", "Background", "Orphan":
			policy := metav1.DeletionPropagation(policyStr)
			opts.PropagationPolicy = &policy
		default:
			return &ActionResult{Status: "error", Message: fmt.Sprintf("invalid propagationPolicy %q", policyStr)}, nil
		}
	} else {
		policy := metav1.DeletePropagationBackground
		opts.PropagationPolicy = &policy
	}

	err := c.Clientset.AppsV1().StatefulSets(req.Namespace).Delete(ctx, req.Name, opts)
	if err != nil {
		return nil, err
	}

	return &ActionResult{
		Status:  "ok",
		Message: fmt.Sprintf("Deleted statefulset %s/%s", req.Namespace, req.Name),
		Details: map[string]any{
			"namespace": req.Namespace,
			"name":      req.Name,
		},
	}, nil
}
