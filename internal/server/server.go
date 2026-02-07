package server

import (
	"context"
	"embed"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"kview/internal/cluster"
	"kview/internal/kube"
	"kview/internal/stream"
)

//go:embed ui_dist
var uiFS embed.FS

type Server struct {
	mgr   *cluster.Manager
	token string
}

func New(mgr *cluster.Manager, token string) *Server {
	return &Server{mgr: mgr, token: token}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*"},
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Protected API
	r.Route("/api", func(api chi.Router) {
		api.Use(s.authMiddleware)

		api.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
			writeJSON(w, http.StatusOK, map[string]any{
				"ok":            true,
				"activeContext": s.mgr.ActiveContext(),
			})
		})

		api.Get("/contexts", func(w http.ResponseWriter, r *http.Request) {
			writeJSON(w, http.StatusOK, map[string]any{
				"active":   s.mgr.ActiveContext(),
				"contexts": s.mgr.ListContexts(),
			})
		})

		api.Post("/context/select", func(w http.ResponseWriter, r *http.Request) {
			var body struct {
				Name string `json:"name"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid body"})
				return
			}
			if err := s.mgr.SetActiveContext(body.Name); err != nil {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
				return
			}
			writeJSON(w, http.StatusOK, map[string]any{"active": s.mgr.ActiveContext()})
		})

		api.Get("/namespaces", func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			nss, err := kube.ListNamespaces(ctx, clients)
			if err != nil {
				// If forbidden, return limited mode
				if apierrors.IsForbidden(err) {
					writeJSON(w, http.StatusOK, map[string]any{
						"active":  active,
						"limited": true,
						"items":   []kube.NamespaceDTO{},
					})
					return
				}
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{
				"active":  active,
				"limited": false,
				"items":   nss,
			})
		})

		api.Get("/nodes", func(w http.ResponseWriter, r *http.Request) {
			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListNodes(ctx, clients)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/nodes/{name}", func(w http.ResponseWriter, r *http.Request) {
			name := chi.URLParam(r, "name")
			if name == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing node name"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetNodeDetails(ctx, clients, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/pods", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			pods, err := kube.ListPods(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": pods})
		})

		api.Get("/namespaces/{ns}/pods/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetPodDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/pods/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForPod(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})

		api.Get("/namespaces/{ns}/pods/{name}/logs/ws", (&stream.LogsWS{Mgr: s.mgr}).ServeHTTP)

		api.Get("/namespaces/{ns}/deployments", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListDeployments(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/namespaces/{ns}/deployments/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetDeploymentDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/deployments/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForObject(ctx, clients, ns, "Deployment", name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})

		api.Get("/namespaces/{ns}/replicasets", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListReplicaSets(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/namespaces/{ns}/replicasets/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetReplicaSetDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/replicasets/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForObject(ctx, clients, ns, "ReplicaSet", name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})

		api.Get("/namespaces/{ns}/jobs", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListJobs(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/namespaces/{ns}/jobs/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetJobDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/jobs/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForObject(ctx, clients, ns, "Job", name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})

		api.Get("/namespaces/{ns}/cronjobs", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListCronJobs(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/namespaces/{ns}/cronjobs/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetCronJobDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/cronjobs/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForObject(ctx, clients, ns, "CronJob", name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})

		api.Get("/namespaces/{ns}/services", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListServices(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/namespaces/{ns}/services/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetServiceDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/services/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForObject(ctx, clients, ns, "Service", name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})

		api.Get("/namespaces/{ns}/ingresses", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			if ns == "" {
				writeJSON(w, http.StatusBadRequest, map[string]any{"error": "missing namespace"})
				return
			}

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			items, err := kube.ListIngresses(ctx, clients, ns)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": items})
		})

		api.Get("/namespaces/{ns}/ingresses/{name}", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			det, err := kube.GetIngressDetails(ctx, clients, ns, name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "item": det})
		})

		api.Get("/namespaces/{ns}/ingresses/{name}/events", func(w http.ResponseWriter, r *http.Request) {
			ns := chi.URLParam(r, "ns")
			name := chi.URLParam(r, "name")

			ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
			defer cancel()

			clients, active, err := s.mgr.GetClients(ctx)
			if err != nil {
				writeJSON(w, http.StatusInternalServerError, map[string]any{"error": err.Error(), "active": active})
				return
			}

			evs, err := kube.ListEventsForObject(ctx, clients, ns, "Ingress", name)
			if err != nil {
				status := http.StatusInternalServerError
				if apierrors.IsForbidden(err) {
					status = http.StatusForbidden
				}
				writeJSON(w, status, map[string]any{"error": err.Error(), "active": active})
				return
			}

			writeJSON(w, http.StatusOK, map[string]any{"active": active, "items": evs})
		})
	})

	// Public UI (SPA)
	r.Get("/*", s.serveUI)

	return r
}

func (s *Server) authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if strings.HasPrefix(token, "Bearer ") {
			token = strings.TrimPrefix(token, "Bearer ")
		} else {
			token = r.URL.Query().Get("token")
		}

		if token != s.token {
			writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "unauthorized"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) serveUI(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/")
	if path == "" {
		path = "ui_dist/index.html"
	} else {
		path = "ui_dist/" + path
	}

	b, err := uiFS.ReadFile(path)
	if err != nil {
		b, err = uiFS.ReadFile("ui_dist/index.html")
		if err != nil {
			http.Error(w, "UI not built", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(b)
		return
	}

	w.Header().Set("Content-Type", contentTypeByPath(path))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(b)
}

func contentTypeByPath(p string) string {
	switch {
	case strings.HasSuffix(p, ".html"):
		return "text/html; charset=utf-8"
	case strings.HasSuffix(p, ".js"):
		return "application/javascript; charset=utf-8"
	case strings.HasSuffix(p, ".css"):
		return "text/css; charset=utf-8"
	case strings.HasSuffix(p, ".svg"):
		return "image/svg+xml"
	case strings.HasSuffix(p, ".png"):
		return "image/png"
	default:
		return "application/octet-stream"
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

