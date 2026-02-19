package kube

import (
	"context"
	"fmt"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// validateNamespacedTarget returns an error if req.Group, req.Resource,
// req.Namespace, or req.Name do not match expectations.
func validateNamespacedTarget(req ActionRequest, expectedGroup, expectedResource string) error {
	if req.Group != expectedGroup {
		return fmt.Errorf("unsupported group %q, expected %q", req.Group, expectedGroup)
	}
	if req.Resource != expectedResource {
		return fmt.Errorf("unsupported resource %q, expected %q", req.Resource, expectedResource)
	}
	if req.Namespace == "" {
		return fmt.Errorf("namespace is required")
	}
	if req.Name == "" {
		return fmt.Errorf("name is required")
	}
	return nil
}

// buildDeleteOptions parses the optional propagationPolicy param from req and
// returns the corresponding DeleteOptions. If the param is present but invalid
// it returns a non-nil *ActionResult that the caller should return immediately.
func buildDeleteOptions(req ActionRequest) (metav1.DeleteOptions, *ActionResult) {
	opts := metav1.DeleteOptions{}
	if raw, ok := req.Params["propagationPolicy"]; ok {
		policyStr, ok := raw.(string)
		if !ok {
			return opts, &ActionResult{Status: "error", Message: "params.propagationPolicy must be a string"}
		}
		switch policyStr {
		case "Foreground", "Background", "Orphan":
			policy := metav1.DeletionPropagation(policyStr)
			opts.PropagationPolicy = &policy
		default:
			return opts, &ActionResult{Status: "error", Message: fmt.Sprintf("invalid propagationPolicy %q", policyStr)}
		}
	} else {
		policy := metav1.DeletePropagationBackground
		opts.PropagationPolicy = &policy
	}
	return opts, nil
}

// handleNamespacedDelete is the shared helper for simple namespaced-delete
// action handlers. It validates the target, builds DeleteOptions from the
// request params, calls deleteFn, and returns the canonical ActionResult.
func handleNamespacedDelete(
	ctx context.Context,
	req ActionRequest,
	expectedGroup, expectedResource, kindLabel string,
	deleteFn func(ctx context.Context, ns, name string, opts metav1.DeleteOptions) error,
) (*ActionResult, error) {
	if err := validateNamespacedTarget(req, expectedGroup, expectedResource); err != nil {
		return &ActionResult{Status: "error", Message: err.Error()}, nil
	}

	opts, errResult := buildDeleteOptions(req)
	if errResult != nil {
		return errResult, nil
	}

	if err := deleteFn(ctx, req.Namespace, req.Name, opts); err != nil {
		return nil, err
	}

	return &ActionResult{
		Status:  "ok",
		Message: fmt.Sprintf("Deleted %s %s/%s", kindLabel, req.Namespace, req.Name),
		Details: map[string]any{
			"namespace": req.Namespace,
			"name":      req.Name,
		},
	}, nil
}
