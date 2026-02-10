package kube

import (
	"context"
	"fmt"
	"sort"

	"kview/internal/cluster"
	"kview/internal/kube/dto"
)

func GetHelmReleaseDetails(ctx context.Context, c *cluster.Clients, namespace, releaseName string) (*dto.HelmReleaseDetailsDTO, error) {
	entries, err := listHelmSecretEntries(ctx, c, namespace)
	if err != nil {
		return nil, err
	}

	var matched []secretEntry
	for _, e := range entries {
		if e.relName == releaseName {
			matched = append(matched, e)
		}
	}

	if len(matched) == 0 {
		return nil, fmt.Errorf("helm release %q not found", releaseName)
	}

	sort.Slice(matched, func(i, j int) bool {
		return matched[i].revision > matched[j].revision
	})

	history := make([]dto.HelmReleaseRevision, 0, len(matched))
	for _, e := range matched {
		rel, decErr := decodeHelmRelease(e.data)
		if decErr != nil {
			history = append(history, dto.HelmReleaseRevision{
				Revision:    e.revision,
				Status:      "unknown",
				DecodeError: decErr.Error(),
			})
			continue
		}

		rev := dto.HelmReleaseRevision{
			Revision: e.revision,
		}
		if rel.Info != nil {
			rev.Status = rel.Info.Status
			rev.Updated = parseHelmTimestamp(rel.Info.LastDeployed)
			rev.Description = rel.Info.Description
		}
		if rel.Chart != nil && rel.Chart.Metadata != nil {
			rev.Chart = chartString(rel.Chart.Metadata)
			rev.ChartVersion = rel.Chart.Metadata.Version
			rev.AppVersion = rel.Chart.Metadata.AppVersion
		}
		history = append(history, rev)
	}

	latest := matched[0]
	latestRel, latestErr := decodeHelmRelease(latest.data)

	summary := dto.HelmReleaseSummaryDTO{
		Name:           releaseName,
		Namespace:      namespace,
		Revision:       latest.revision,
		StorageBackend: latest.backend,
	}

	if latestErr != nil {
		summary.Status = "unknown"
		summary.DecodeError = latestErr.Error()
	} else {
		if latestRel.Info != nil {
			summary.Status = latestRel.Info.Status
			summary.Updated = parseHelmTimestamp(latestRel.Info.LastDeployed)
			summary.Description = latestRel.Info.Description
		}
		if latestRel.Chart != nil && latestRel.Chart.Metadata != nil {
			summary.Chart = chartString(latestRel.Chart.Metadata)
			summary.ChartVersion = latestRel.Chart.Metadata.Version
			summary.AppVersion = latestRel.Chart.Metadata.AppVersion
		}
	}

	notes := ""
	if latestErr == nil && latestRel.Info != nil {
		notes = latestRel.Info.Notes
	}

	return &dto.HelmReleaseDetailsDTO{
		Summary: summary,
		History: history,
		Notes:   notes,
	}, nil
}
