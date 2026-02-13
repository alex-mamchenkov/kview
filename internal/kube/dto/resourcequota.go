package dto

type ResourceQuotaListDTO struct {
	Items []ResourceQuotaDTO `json:"items"`
}

type ResourceQuotaDTO struct {
	Name      string                  `json:"name"`
	Namespace string                  `json:"namespace"`
	AgeSec    int64                   `json:"ageSec"`
	Entries   []ResourceQuotaEntryDTO `json:"entries"`
}

type ResourceQuotaEntryDTO struct {
	Key   string   `json:"key"`
	Used  string   `json:"used"`
	Hard  string   `json:"hard"`
	Ratio *float64 `json:"ratio,omitempty"`
}
