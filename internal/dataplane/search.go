package dataplane

type CachedResourceSearch struct {
	Active  string                     `json:"active"`
	Query   string                     `json:"query"`
	Limit   int                        `json:"limit"`
	Offset  int                        `json:"offset"`
	HasMore bool                       `json:"hasMore"`
	Items   []CachedResourceSearchItem `json:"items"`
}

type CachedResourceSearchItem struct {
	Cluster    string `json:"cluster"`
	Kind       string `json:"kind"`
	Namespace  string `json:"namespace,omitempty"`
	Name       string `json:"name"`
	ObservedAt string `json:"observedAt,omitempty"`
}
