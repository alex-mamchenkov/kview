package kube

import (
	"encoding/json"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"sigs.k8s.io/yaml"
)

// MarshalObjectYAML ensures the object has explicit TypeMeta before converting it to YAML.
func MarshalObjectYAML(obj runtime.Object, apiVersion, kind string) ([]byte, error) {
	if obj != nil {
		obj.GetObjectKind().SetGroupVersionKind(schema.FromAPIVersionAndKind(apiVersion, kind))
	}
	b, err := json.Marshal(obj)
	if err != nil {
		return nil, err
	}
	return yaml.JSONToYAML(b)
}
