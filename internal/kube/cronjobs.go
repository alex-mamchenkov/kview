package kube

import (
	"context"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

func ListCronJobs(ctx context.Context, c *cluster.Clients, namespace string) ([]dto.CronJobDTO, error) {
	cronJobs, err := c.Clientset.BatchV1().CronJobs(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	now := time.Now()
	out := make([]dto.CronJobDTO, 0, len(cronJobs.Items))
	for _, cj := range cronJobs.Items {
		age := int64(0)
		if !cj.CreationTimestamp.IsZero() {
			age = int64(now.Sub(cj.CreationTimestamp.Time).Seconds())
		}

		suspend := false
		if cj.Spec.Suspend != nil {
			suspend = *cj.Spec.Suspend
		}

		out = append(out, dto.CronJobDTO{
			Name:               cj.Name,
			Namespace:          cj.Namespace,
			Schedule:           cj.Spec.Schedule,
			Suspend:            suspend,
			Active:             int32(len(cj.Status.Active)),
			LastScheduleTime:   timeFrom(cj.Status.LastScheduleTime),
			LastSuccessfulTime: timeFrom(cj.Status.LastSuccessfulTime),
			AgeSec:             age,
		})
	}

	return out, nil
}
