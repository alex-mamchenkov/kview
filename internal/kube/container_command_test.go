package kube

import "testing"

func TestBuildContainerShellCommandQuotesWorkdir(t *testing.T) {
	got := buildContainerShellCommand("php artisan about", "/srv/app's/current")
	want := []string{"/bin/sh", "-lc", "cd '/srv/app'\"'\"'s/current' && php artisan about"}
	if len(got) != len(want) {
		t.Fatalf("command length = %d, want %d: %#v", len(got), len(want), got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("command[%d] = %q, want %q", i, got[i], want[i])
		}
	}
}
