package server

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
	"time"

	"kview/internal/dataplane"
)

func TestWriteDataplaneListResponse_MetadataShape(t *testing.T) {
	rec := httptest.NewRecorder()
	obs := time.Date(2020, 1, 2, 3, 4, 5, 0, time.UTC)
	meta := dataplane.SnapshotMetadata{
		ObservedAt:   obs,
		Revision:     42,
		Freshness:    dataplane.FreshnessClassHot,
		Coverage:     dataplane.CoverageClassFull,
		Degradation:  dataplane.DegradationClassNone,
		Completeness: dataplane.CompletenessClassComplete,
	}
	items := []string{"a", "b"}
	writeDataplaneListResponse(rec, "test-context", items, meta, nil)

	if rec.Code != 200 {
		t.Fatalf("status %d", rec.Code)
	}
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["active"] != "test-context" {
		t.Fatalf("active: %v", body["active"])
	}
	if body["observed"] != obs.Format(time.RFC3339Nano) {
		t.Fatalf("observed: %v", body["observed"])
	}
	metaObj, ok := body["meta"].(map[string]any)
	if !ok {
		t.Fatalf("meta missing or wrong type: %#v", body["meta"])
	}
	for _, k := range []string{"revision", "freshness", "coverage", "degradation", "completeness", "state"} {
		if _, ok := metaObj[k]; !ok {
			t.Fatalf("meta.%s missing", k)
		}
	}
	if metaObj["revision"] != "42" {
		t.Fatalf("revision: %v", metaObj["revision"])
	}
	if metaObj["freshness"] != string(dataplane.FreshnessClassHot) {
		t.Fatalf("freshness: %v", metaObj["freshness"])
	}
	if metaObj["state"] != "ok" {
		t.Fatalf("state: %v", metaObj["state"])
	}
}

func TestWriteDataplaneListResponse_EmptyItemsState(t *testing.T) {
	rec := httptest.NewRecorder()
	meta := dataplane.SnapshotMetadata{ObservedAt: time.Now().UTC()}
	writeDataplaneListResponse(rec, "ctx", []string{}, meta, nil)
	var body map[string]any
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	metaObj := body["meta"].(map[string]any)
	if metaObj["state"] != "empty" {
		t.Fatalf("expected empty state, got %v", metaObj["state"])
	}
}
