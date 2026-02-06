package kube

import (
	"context"
	"encoding/json"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	"kview/internal/cluster"
)

type DeploymentDetailsDTO struct {
	Summary DeploymentSummaryDTO `json:"summary"`
	YAML    string               `json:"yaml"`
}

type DeploymentSummaryDTO struct {
	Name       string `json:"name"`
	Namespace  string `json:"namespace"`
	Strategy   string `json:"strategy"`
	Selector   string `json:"selector"`
	Desired    int32  `json:"desired"`
	Current    int32  `json:"current"`
	Ready      int32  `json:"ready"`
	Available  int32  `json:"available"`
	UpToDate   int32  `json:"upToDate"`
}

func GetDeploymentDetails(ctx context.Context, c *cluster.Clients, namespace, name string) (*DeploymentDetailsDTO, error) {
	dep, err := c.Clientset.AppsV1().Deployments(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	// YAML
	depCopy := dep.DeepCopy()
	depCopy.ManagedFields = nil
	b, err := json.Marshal(depCopy)
	if err != nil {
		return nil, err
	}
	y, err := yaml.JSONToYAML(b)
	if err != nil {
		return nil, err
	}

	strategy := string(dep.Spec.Strategy.Type)
	if strategy == "" {
		strategy = "RollingUpdate"
	}

	selector := ""
	if dep.Spec.Selector != nil {
		if sel, err := metav1.LabelSelectorAsSelector(dep.Spec.Selector); err == nil {
			selector = sel.String()
		}
	}

	desired := int32(0)
	if dep.Spec.Replicas != nil {
		desired = *dep.Spec.Replicas
	}

	summary := DeploymentSummaryDTO{
		Name:      dep.Name,
		Namespace: dep.Namespace,
		Strategy:  strategy,
		Selector:  selector,
		Desired:   desired,
		Current:   dep.Status.Replicas,
		Ready:     dep.Status.ReadyReplicas,
		Available: dep.Status.AvailableReplicas,
		UpToDate:  dep.Status.UpdatedReplicas,
	}

	return &DeploymentDetailsDTO{
		Summary: summary,
		YAML:    string(y),
	}, nil
}
