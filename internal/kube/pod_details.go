package kube

import (
	"context"
	"encoding/json"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"sigs.k8s.io/yaml"

	"kview/internal/cluster"
)

type PodDetailsDTO struct {
	Summary     PodDTO    `json:"summary"`
	YAML        string    `json:"yaml"`
	Containers  []string  `json:"containers"`
}

func GetPodDetails(ctx context.Context, c *cluster.Clients, namespace, name string) (*PodDetailsDTO, error) {
	pod, err := c.Clientset.CoreV1().Pods(namespace).Get(ctx, name, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}

	// YAML
	podCopy := pod.DeepCopy()
	podCopy.ManagedFields = nil
	b, err := json.Marshal(podCopy)
	if err != nil {
		return nil, err
	}
	y, err := yaml.JSONToYAML(b)
	if err != nil {
		return nil, err
	}

	// Summary
	var readyCount, totalCount int
	var restarts int32
	for _, cs := range pod.Status.ContainerStatuses {
		totalCount++
		if cs.Ready {
			readyCount++
		}
		restarts += cs.RestartCount
	}

	summary := PodDTO{
		Name:      pod.Name,
		Namespace: pod.Namespace,
		Node:      pod.Spec.NodeName,
		Phase:     string(pod.Status.Phase),
		Ready:     fmtReady(readyCount, totalCount),
		Restarts:  restarts,
		AgeSec:    0, // optional
	}

	containers := make([]string, 0, len(pod.Spec.Containers))
	for _, ctn := range pod.Spec.Containers {
		containers = append(containers, ctn.Name)
	}

	return &PodDetailsDTO{
		Summary:    summary,
		YAML:       string(y),
		Containers: containers,
	}, nil
}

