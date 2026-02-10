package kube

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

var helmSecretNameRe = regexp.MustCompile(`^sh\.helm\.release\.v1\.(.+)\.v(\d+)$`)

type helmReleaseMeta struct {
	Name     string `json:"name"`
	Info     *helmReleaseInfo   `json:"info"`
	Chart    *helmReleaseChart  `json:"chart"`
	Version  int                `json:"version"`
	Namespace string            `json:"namespace"`
}

type helmReleaseInfo struct {
	Status       string `json:"status"`
	FirstDeployed string `json:"first_deployed"`
	LastDeployed  string `json:"last_deployed"`
	Description  string `json:"description"`
	Notes        string `json:"notes"`
}

type helmReleaseChart struct {
	Metadata *helmChartMetadata `json:"metadata"`
}

type helmChartMetadata struct {
	Name       string `json:"name"`
	Version    string `json:"version"`
	AppVersion string `json:"appVersion"`
}

func decodeHelmRelease(data []byte) (*helmReleaseMeta, error) {
	decoded, err := base64.StdEncoding.DecodeString(string(data))
	if err != nil {
		return nil, fmt.Errorf("base64 decode: %w", err)
	}

	gz, err := gzip.NewReader(bytes.NewReader(decoded))
	if err != nil {
		return nil, fmt.Errorf("gzip open: %w", err)
	}
	defer gz.Close()

	raw, err := io.ReadAll(gz)
	if err != nil {
		return nil, fmt.Errorf("gzip read: %w", err)
	}

	var rel helmReleaseMeta
	if err := json.Unmarshal(raw, &rel); err != nil {
		return nil, fmt.Errorf("json unmarshal: %w", err)
	}

	return &rel, nil
}

func parseHelmTimestamp(ts string) int64 {
	if ts == "" {
		return 0
	}
	formats := []string{
		"2006-01-02T15:04:05.999999999Z07:00",
		"2006-01-02T15:04:05Z07:00",
		"2006-01-02 15:04:05.999999999 -0700 MST",
		"2006-01-02 15:04:05.999999999 +0000 UTC",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, ts); err == nil {
			return t.Unix()
		}
	}
	return 0
}

func chartString(meta *helmChartMetadata) string {
	if meta == nil {
		return ""
	}
	if meta.Version != "" {
		return meta.Name + "-" + meta.Version
	}
	return meta.Name
}

type secretEntry struct {
	secretName string
	relName    string
	revision   int
	data       []byte
	backend    string
}

func listHelmSecretEntries(ctx context.Context, c *cluster.Clients, namespace string) ([]secretEntry, error) {
	secrets, err := c.Clientset.CoreV1().Secrets(namespace).List(ctx, metav1.ListOptions{
		LabelSelector: "owner=helm",
	})
	if err != nil {
		return nil, err
	}

	var entries []secretEntry
	for _, s := range secrets.Items {
		if s.Type != "helm.sh/release.v1" {
			continue
		}
		m := helmSecretNameRe.FindStringSubmatch(s.Name)
		if m == nil {
			continue
		}
		relName := m[1]
		rev, _ := strconv.Atoi(m[2])
		releaseData := s.Data["release"]
		if len(releaseData) == 0 {
			continue
		}
		entries = append(entries, secretEntry{
			secretName: s.Name,
			relName:    relName,
			revision:   rev,
			data:       releaseData,
			backend:    "Secret",
		})
	}

	return entries, nil
}

func ListHelmReleases(ctx context.Context, c *cluster.Clients, namespace string) ([]dto.HelmReleaseDTO, error) {
	entries, err := listHelmSecretEntries(ctx, c, namespace)
	if err != nil {
		return nil, err
	}

	latest := make(map[string]secretEntry)
	for _, e := range entries {
		if cur, ok := latest[e.relName]; !ok || e.revision > cur.revision {
			latest[e.relName] = e
		}
	}

	out := make([]dto.HelmReleaseDTO, 0, len(latest))
	for _, e := range latest {
		rel, decErr := decodeHelmRelease(e.data)
		if decErr != nil {
			out = append(out, dto.HelmReleaseDTO{
				Name:      e.relName,
				Namespace: namespace,
				Status:    "unknown",
				Revision:  e.revision,
				Chart:     "unknown",
			})
			continue
		}

		status := ""
		updated := int64(0)
		if rel.Info != nil {
			status = rel.Info.Status
			updated = parseHelmTimestamp(rel.Info.LastDeployed)
		}

		chart := ""
		if rel.Chart != nil {
			chart = chartString(rel.Chart.Metadata)
		}

		out = append(out, dto.HelmReleaseDTO{
			Name:      e.relName,
			Namespace: namespace,
			Status:    status,
			Revision:  e.revision,
			Chart:     chart,
			Updated:   updated,
		})
	}

	return out, nil
}
