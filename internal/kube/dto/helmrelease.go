package dto

type HelmReleaseDTO struct {
	Name      string `json:"name"`
	Namespace string `json:"namespace"`
	Status    string `json:"status"`
	Revision  int    `json:"revision"`
	Chart     string `json:"chart"`
	Updated   int64  `json:"updated"`
}

type HelmReleaseDetailsDTO struct {
	Summary HelmReleaseSummaryDTO  `json:"summary"`
	History []HelmReleaseRevision  `json:"history"`
	Notes   string                 `json:"notes,omitempty"`
}

type HelmReleaseSummaryDTO struct {
	Name           string `json:"name"`
	Namespace      string `json:"namespace"`
	Status         string `json:"status"`
	Revision       int    `json:"revision"`
	Updated        int64  `json:"updated"`
	Chart          string `json:"chart"`
	ChartVersion   string `json:"chartVersion"`
	AppVersion     string `json:"appVersion"`
	StorageBackend string `json:"storageBackend"`
	Description    string `json:"description,omitempty"`
	DecodeError    string `json:"decodeError,omitempty"`
}

type HelmReleaseRevision struct {
	Revision     int    `json:"revision"`
	Status       string `json:"status"`
	Updated      int64  `json:"updated"`
	Chart        string `json:"chart"`
	ChartVersion string `json:"chartVersion"`
	AppVersion   string `json:"appVersion"`
	Description  string `json:"description,omitempty"`
	DecodeError  string `json:"decodeError,omitempty"`
}
