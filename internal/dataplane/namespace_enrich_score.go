package dataplane

import (
	"net/url"
	"sort"
	"strings"
)

// NamespaceEnrichHints selects which namespaces receive background row enrichment.
// Only names that appear in the current list snapshot are eligible.
type NamespaceEnrichHints struct {
	Focus    string
	Recent   []string
	Favorite map[string]struct{}
}

const (
	// Scoring: higher runs first. Focus (current UI namespace) beats favorites beats recency.
	nsEnrichScoreFocus    = 1_000_000
	nsEnrichScoreFavorite = 10_000
	nsEnrichScoreRecent   = 500
	nsEnrichMaxTargets    = 32
	nsEnrichMaxParallel   = 2
)

// ParseNamespaceEnrichHints reads optional GET /api/namespaces query parameters:
//   - enrichFocus: current namespace
//   - enrichRecent: comma-separated MRU names (most significant first in the string)
//   - enrichFav: comma-separated favourites
// Repeated query keys for enrichRecent / enrichFav are merged in order.
func ParseNamespaceEnrichHints(q url.Values) NamespaceEnrichHints {
	h := NamespaceEnrichHints{Favorite: make(map[string]struct{})}

	h.Focus = strings.TrimSpace(q.Get("enrichFocus"))

	for _, key := range []string{"enrichRecent", "enrichFav"} {
		for _, raw := range q[key] {
			for _, p := range strings.Split(raw, ",") {
				p = strings.TrimSpace(p)
				if p == "" {
					continue
				}
				if key == "enrichRecent" {
					h.Recent = append(h.Recent, p)
				} else {
					h.Favorite[p] = struct{}{}
				}
			}
		}
		if len(q[key]) == 0 {
			single := strings.TrimSpace(q.Get(key))
			if single == "" {
				continue
			}
			for _, p := range strings.Split(single, ",") {
				p = strings.TrimSpace(p)
				if p == "" {
					continue
				}
				if key == "enrichRecent" {
					h.Recent = append(h.Recent, p)
				} else {
					h.Favorite[p] = struct{}{}
				}
			}
		}
	}

	return h
}

func namespaceEnrichScore(name string, hints NamespaceEnrichHints, recentRank map[string]int) int {
	score := 0
	if name != "" && name == hints.Focus {
		score += nsEnrichScoreFocus
	}
	if _, ok := hints.Favorite[name]; ok {
		score += nsEnrichScoreFavorite
	}
	if r, ok := recentRank[name]; ok && len(hints.Recent) > 0 {
		// Earlier in Recent slice => larger bump (smaller index).
		score += (len(hints.Recent) - r) * nsEnrichScoreRecent
	}
	return score
}

// buildEnrichmentWorkOrder returns namespaces to enrich, highest score first, capped.
// itemOrder is the list snapshot order (used only for stable tie-break; no alphabetical scan).
func buildEnrichmentWorkOrder(itemOrder []string, hints NamespaceEnrichHints) []string {
	present := make(map[string]bool, len(itemOrder))
	pos := make(map[string]int, len(itemOrder))
	for i, n := range itemOrder {
		if n == "" {
			continue
		}
		present[n] = true
		if _, ok := pos[n]; !ok {
			pos[n] = i
		}
	}

	recentRank := make(map[string]int)
	for i, n := range hints.Recent {
		if _, ok := recentRank[n]; !ok {
			recentRank[n] = i
		}
	}

	seen := make(map[string]struct{})
	var candidates []string
	tryAdd := func(n string) {
		if n == "" || !present[n] {
			return
		}
		if _, ok := seen[n]; ok {
			return
		}
		seen[n] = struct{}{}
		candidates = append(candidates, n)
	}

	tryAdd(hints.Focus)
	for _, n := range hints.Recent {
		tryAdd(n)
	}
	for n := range hints.Favorite {
		tryAdd(n)
	}

	if len(candidates) == 0 {
		return nil
	}

	sort.SliceStable(candidates, func(i, j int) bool {
		a, b := candidates[i], candidates[j]
		sa := namespaceEnrichScore(a, hints, recentRank)
		sb := namespaceEnrichScore(b, hints, recentRank)
		if sa != sb {
			return sa > sb
		}
		return pos[a] < pos[b]
	})

	if len(candidates) > nsEnrichMaxTargets {
		candidates = candidates[:nsEnrichMaxTargets]
	}
	return candidates
}
