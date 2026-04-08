package cluster

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

type testLogger struct{}

func (testLogger) Printf(string, ...any) {}

func TestKubeconfigLocationsUsesExplicitConfigBeforeEnv(t *testing.T) {
	t.Setenv("KUBECONFIG", filepath.Join("env", "config"))

	got, explicit := kubeconfigLocations(filepath.Join("flag", "config"))
	want := []string{filepath.Join("flag", "config")}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("locations = %v, want %v", got, want)
	}
	if !explicit {
		t.Fatal("explicit = false, want true")
	}
}

func TestKubeconfigLocationsSplitsPathList(t *testing.T) {
	first := filepath.Join("first", "config")
	second := filepath.Join("second", "config")
	got, explicit := kubeconfigLocations(first + string(os.PathListSeparator) + second)
	want := []string{first, second}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("locations = %v, want %v", got, want)
	}
	if !explicit {
		t.Fatal("explicit = false, want true")
	}
}

func TestBuildLoadingRulesDoesNotFallbackWhenExplicitConfigHasNoFiles(t *testing.T) {
	rules := buildLoadingRules(nil, true)
	if got := rules.GetLoadingPrecedence(); len(got) != 0 {
		t.Fatalf("loading precedence = %v, want empty", got)
	}
}

func TestExpandKubeconfigLocationsExpandsDirectoryInNameOrder(t *testing.T) {
	dir := t.TempDir()
	first := filepath.Join(dir, "a.yaml")
	second := filepath.Join(dir, "b.yaml")
	nested := filepath.Join(dir, "nested")
	for _, path := range []string{second, first} {
		if err := os.WriteFile(path, []byte("apiVersion: v1\n"), 0o600); err != nil {
			t.Fatalf("write %s: %v", path, err)
		}
	}
	if err := os.Mkdir(nested, 0o700); err != nil {
		t.Fatalf("mkdir %s: %v", nested, err)
	}

	got := expandKubeconfigLocations(testLogger{}, []string{dir})
	want := []string{first, second}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("files = %v, want %v", got, want)
	}
}
