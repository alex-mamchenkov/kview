package kube

import (
	"context"
	"sort"

	"helm.sh/helm/v3/pkg/release"
	"helm.sh/helm/v3/pkg/storage"
	"helm.sh/helm/v3/pkg/storage/driver"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

// ListHelmCharts returns logical chart groupings across all namespaces.
// Each entry represents a unique (chartName, chartVersion) combination
// with the count of releases using it and the namespaces where it's deployed.
func ListHelmCharts(_ context.Context, c *cluster.Clients) ([]dto.HelmChartDTO, error) {
	// Query Helm secrets across all namespaces.
	d := driver.NewSecrets(c.Clientset.CoreV1().Secrets(""))
	store := storage.Init(d)
	store.Log = func(_ string, _ ...interface{}) {}

	allReleases, err := store.ListReleases()
	if err != nil {
		return nil, err
	}

	// Deduplicate to latest revision per release.
	latest := latestRevisions(allReleases)

	// Group by (chartName, chartVersion).
	type chartKey struct {
		name    string
		version string
	}
	type chartAgg struct {
		appVersion string
		releases   int
		namespaces map[string]bool
	}

	groups := make(map[chartKey]*chartAgg)
	for _, rel := range latest {
		key := chartKeyFromRelease(rel)
		agg, ok := groups[key]
		if !ok {
			agg = &chartAgg{namespaces: make(map[string]bool)}
			groups[key] = agg
		}
		agg.releases++
		ns := rel.Namespace
		if ns != "" {
			agg.namespaces[ns] = true
		}
		if rel.Chart != nil && rel.Chart.Metadata != nil && agg.appVersion == "" {
			agg.appVersion = rel.Chart.Metadata.AppVersion
		}
	}

	out := make([]dto.HelmChartDTO, 0, len(groups))
	for key, agg := range groups {
		nsList := make([]string, 0, len(agg.namespaces))
		for ns := range agg.namespaces {
			nsList = append(nsList, ns)
		}
		sort.Strings(nsList)

		out = append(out, dto.HelmChartDTO{
			ChartName:    key.name,
			ChartVersion: key.version,
			AppVersion:   agg.appVersion,
			Releases:     agg.releases,
			Namespaces:   nsList,
		})
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].ChartName != out[j].ChartName {
			return out[i].ChartName < out[j].ChartName
		}
		return out[i].ChartVersion < out[j].ChartVersion
	})

	return out, nil
}

func chartKeyFromRelease(rel *release.Release) struct {
	name    string
	version string
} {
	name := "unknown"
	version := ""
	if rel.Chart != nil && rel.Chart.Metadata != nil {
		name = rel.Chart.Metadata.Name
		version = rel.Chart.Metadata.Version
	}
	return struct {
		name    string
		version string
	}{name: name, version: version}
}
