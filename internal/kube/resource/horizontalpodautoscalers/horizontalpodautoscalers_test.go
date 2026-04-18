package horizontalpodautoscalers

import (
	"testing"

	autoscalingv2 "k8s.io/api/autoscaling/v2"
	corev1 "k8s.io/api/core/v1"
)

func TestHPAMetricsUseSpecWhenStatusIsEmpty(t *testing.T) {
	utilization := int32(5000)
	got := hpaMetrics(nil, []autoscalingv2.MetricSpec{
		{
			Type: autoscalingv2.ResourceMetricSourceType,
			Resource: &autoscalingv2.ResourceMetricSource{
				Name: corev1.ResourceCPU,
				Target: autoscalingv2.MetricTarget{
					Type:               autoscalingv2.UtilizationMetricType,
					AverageUtilization: &utilization,
				},
			},
		},
	})

	if len(got) != 1 {
		t.Fatalf("expected one metric, got %d", len(got))
	}
	if got[0].Type != "Resource" {
		t.Fatalf("expected metric type Resource, got %q", got[0].Type)
	}
	if got[0].Name != "cpu" {
		t.Fatalf("expected metric name cpu, got %q", got[0].Name)
	}
	if got[0].Target != "5000% average utilization" {
		t.Fatalf("expected target from spec, got %q", got[0].Target)
	}
	if got[0].Current != "" {
		t.Fatalf("expected no current metric without status, got %q", got[0].Current)
	}
}

func TestHPAMetricsOverlayStatusOnSpecMetric(t *testing.T) {
	target := int32(80)
	current := int32(50)
	got := hpaMetrics([]autoscalingv2.MetricStatus{
		{
			Type: autoscalingv2.ResourceMetricSourceType,
			Resource: &autoscalingv2.ResourceMetricStatus{
				Name: corev1.ResourceCPU,
				Current: autoscalingv2.MetricValueStatus{
					AverageUtilization: &current,
				},
			},
		},
	}, []autoscalingv2.MetricSpec{
		{
			Type: autoscalingv2.ResourceMetricSourceType,
			Resource: &autoscalingv2.ResourceMetricSource{
				Name: corev1.ResourceCPU,
				Target: autoscalingv2.MetricTarget{
					Type:               autoscalingv2.UtilizationMetricType,
					AverageUtilization: &target,
				},
			},
		},
	})

	if len(got) != 1 {
		t.Fatalf("expected one merged metric, got %d", len(got))
	}
	if got[0].Name != "cpu" || got[0].Target != "80% average utilization" || got[0].Current != "50%" {
		t.Fatalf("unexpected merged metric: %#v", got[0])
	}
}
