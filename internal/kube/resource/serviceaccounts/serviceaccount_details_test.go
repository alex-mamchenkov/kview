package serviceaccounts

import (
	"testing"

	rbacv1 "k8s.io/api/rbac/v1"
)

func TestRoleBindingHasServiceAccountSubject(t *testing.T) {
	cases := []struct {
		name      string
		subjects  []rbacv1.Subject
		namespace string
		saName    string
		want      bool
	}{
		{
			name:      "same namespace explicit",
			namespace: "apps",
			saName:    "builder",
			subjects:  []rbacv1.Subject{{Kind: "ServiceAccount", Namespace: "apps", Name: "builder"}},
			want:      true,
		},
		{
			name:      "empty subject namespace defaults to rolebinding namespace",
			namespace: "apps",
			saName:    "builder",
			subjects:  []rbacv1.Subject{{Kind: "ServiceAccount", Name: "builder"}},
			want:      true,
		},
		{
			name:      "different namespace ignored",
			namespace: "apps",
			saName:    "builder",
			subjects:  []rbacv1.Subject{{Kind: "ServiceAccount", Namespace: "other", Name: "builder"}},
			want:      false,
		},
		{
			name:      "different kind ignored",
			namespace: "apps",
			saName:    "builder",
			subjects:  []rbacv1.Subject{{Kind: "User", Name: "builder"}},
			want:      false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := roleBindingHasServiceAccountSubject(tc.subjects, tc.namespace, tc.saName); got != tc.want {
				t.Fatalf("roleBindingHasServiceAccountSubject() = %v, want %v", got, tc.want)
			}
		})
	}
}
