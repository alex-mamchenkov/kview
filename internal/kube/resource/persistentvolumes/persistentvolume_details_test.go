package persistentvolumes

import (
	"reflect"
	"testing"

	"github.com/korex-labs/kview/v5/internal/kube/dto"
	corev1 "k8s.io/api/core/v1"
)

func TestMapPVClaimRef(t *testing.T) {
	cases := []struct {
		name string
		ref  *corev1.ObjectReference
		want *dto.PersistentVolumeClaimRefDTO
	}{
		{"nil ref", nil, nil},
		{"empty name", &corev1.ObjectReference{Namespace: "apps"}, nil},
		{"trims namespace", &corev1.ObjectReference{Namespace: " apps ", Name: "data"}, &dto.PersistentVolumeClaimRefDTO{Namespace: "apps", Name: "data"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := mapPVClaimRef(tc.ref); !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("mapPVClaimRef() = %#v, want %#v", got, tc.want)
			}
		})
	}
}

func TestMapMountOptionsSkipsBlankValues(t *testing.T) {
	got := mapMountOptions([]string{"rw", " ", "noatime", ""})
	if !reflect.DeepEqual(got, []string{"rw", "noatime"}) {
		t.Fatalf("mapMountOptions() = %#v", got)
	}
	if got := mapMountOptions([]string{" ", ""}); got != nil {
		t.Fatalf("blank mount options = %#v, want nil", got)
	}
}

func TestMapPersistentVolumeSourceCommonTypes(t *testing.T) {
	hostPathType := corev1.HostPathDirectory
	readOnly := true
	cases := []struct {
		name        string
		source      corev1.PersistentVolumeSource
		wantType    string
		wantDetails []dto.PersistentVolumeSourceDetailDTO
	}{
		{
			name:     "csi",
			source:   corev1.PersistentVolumeSource{CSI: &corev1.CSIPersistentVolumeSource{Driver: "disk.csi", VolumeHandle: "vol-1", FSType: "ext4", ReadOnly: true}},
			wantType: "CSI",
			wantDetails: []dto.PersistentVolumeSourceDetailDTO{
				{Label: "Driver", Value: "disk.csi"},
				{Label: "Volume Handle", Value: "vol-1"},
				{Label: "FS Type", Value: "ext4"},
				{Label: "Read Only", Value: "Yes"},
			},
		},
		{
			name:     "nfs",
			source:   corev1.PersistentVolumeSource{NFS: &corev1.NFSVolumeSource{Server: "nfs.local", Path: "/exports/data"}},
			wantType: "NFS",
			wantDetails: []dto.PersistentVolumeSourceDetailDTO{
				{Label: "Server", Value: "nfs.local"},
				{Label: "Path", Value: "/exports/data"},
				{Label: "Read Only", Value: "No"},
			},
		},
		{
			name:     "host path",
			source:   corev1.PersistentVolumeSource{HostPath: &corev1.HostPathVolumeSource{Path: "/var/lib/data", Type: &hostPathType}},
			wantType: "HostPath",
			wantDetails: []dto.PersistentVolumeSourceDetailDTO{
				{Label: "Path", Value: "/var/lib/data"},
				{Label: "Type", Value: "Directory"},
			},
		},
		{
			name:     "azure file",
			source:   corev1.PersistentVolumeSource{AzureFile: &corev1.AzureFilePersistentVolumeSource{ShareName: "share", ReadOnly: readOnly}},
			wantType: "Azure File",
			wantDetails: []dto.PersistentVolumeSourceDetailDTO{
				{Label: "Share Name", Value: "share"},
				{Label: "Read Only", Value: "Yes"},
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := mapPersistentVolumeSource(tc.source)
			if got.Type != tc.wantType {
				t.Fatalf("type = %q, want %q", got.Type, tc.wantType)
			}
			if !reflect.DeepEqual(got.Details, tc.wantDetails) {
				t.Fatalf("details = %#v, want %#v", got.Details, tc.wantDetails)
			}
		})
	}
}

func TestPersistentVolumeSourceOtherHasNoDetails(t *testing.T) {
	got := mapPersistentVolumeSource(corev1.PersistentVolumeSource{})
	if got.Type != "Other" {
		t.Fatalf("type = %q, want Other", got.Type)
	}
	if got.Details != nil {
		t.Fatalf("details = %#v, want nil", got.Details)
	}
}
