package dataplane

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"time"

	bolt "go.etcd.io/bbolt"
)

const searchKeySeparator = "\x00"

var (
	dataplaneSnapshotBucket  = []byte("snapshots_v1")
	dataplaneSearchBucket    = []byte("search_name_v1")
	dataplaneCellIndexBucket = []byte("search_cell_v1")
)

type snapshotPersistence interface {
	Load(cluster string, kind ResourceKind, namespace string, into any) (bool, error)
	Save(cluster string, kind ResourceKind, namespace string, snap any) error
	Delete(cluster string, kind ResourceKind, namespace string) error
	Close() error
}

type boltSnapshotPersistence struct {
	db *bolt.DB
}

func defaultDataplanePersistencePath() string {
	base, err := os.UserCacheDir()
	if err != nil || base == "" {
		base = os.TempDir()
	}
	return filepath.Join(base, "kview", "dataplane-cache.bbolt")
}

func openBoltSnapshotPersistence(path string) (*boltSnapshotPersistence, error) {
	if path == "" {
		path = defaultDataplanePersistencePath()
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		return nil, err
	}
	db, err := bolt.Open(path, 0o600, &bolt.Options{Timeout: time.Second})
	if err != nil {
		return nil, err
	}
	if err := db.Update(func(tx *bolt.Tx) error {
		for _, bucket := range [][]byte{dataplaneSnapshotBucket, dataplaneSearchBucket, dataplaneCellIndexBucket} {
			if _, err := tx.CreateBucketIfNotExists(bucket); err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &boltSnapshotPersistence{db: db}, nil
}

func (p *boltSnapshotPersistence) Close() error {
	if p == nil || p.db == nil {
		return nil
	}
	return p.db.Close()
}

func (p *boltSnapshotPersistence) Load(cluster string, kind ResourceKind, namespace string, into any) (bool, error) {
	if p == nil || p.db == nil {
		return false, nil
	}
	key := snapshotKey(cluster, kind, namespace)
	var payload []byte
	err := p.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(dataplaneSnapshotBucket)
		if b == nil {
			return nil
		}
		raw := b.Get(key)
		if raw == nil {
			return nil
		}
		payload = append([]byte(nil), raw...)
		return nil
	})
	if err != nil || payload == nil {
		return false, err
	}
	if err := json.Unmarshal(payload, into); err != nil {
		return false, err
	}
	return true, nil
}

func (p *boltSnapshotPersistence) Save(cluster string, kind ResourceKind, namespace string, snap any) error {
	if p == nil || p.db == nil {
		return nil
	}
	payload, err := json.Marshal(snap)
	if err != nil {
		return err
	}
	cellKey := snapshotKey(cluster, kind, namespace)
	rows := searchRowsFromSnapshot(cluster, kind, namespace, snap)
	return p.db.Update(func(tx *bolt.Tx) error {
		snapshots, err := tx.CreateBucketIfNotExists(dataplaneSnapshotBucket)
		if err != nil {
			return err
		}
		search, err := tx.CreateBucketIfNotExists(dataplaneSearchBucket)
		if err != nil {
			return err
		}
		cells, err := tx.CreateBucketIfNotExists(dataplaneCellIndexBucket)
		if err != nil {
			return err
		}
		if err := snapshots.Put(cellKey, payload); err != nil {
			return err
		}
		if err := deleteCellIndex(search, cells, cellKey); err != nil {
			return err
		}
		indexKeys := make([][]byte, 0, len(rows))
		for _, row := range rows {
			key := searchIndexKey(row)
			value, err := json.Marshal(row)
			if err != nil {
				return err
			}
			if err := search.Put(key, value); err != nil {
				return err
			}
			indexKeys = append(indexKeys, key)
		}
		cellPayload, err := json.Marshal(indexKeys)
		if err != nil {
			return err
		}
		return cells.Put(cellKey, cellPayload)
	})
}

func (p *boltSnapshotPersistence) Delete(cluster string, kind ResourceKind, namespace string) error {
	if p == nil || p.db == nil {
		return nil
	}
	cellKey := snapshotKey(cluster, kind, namespace)
	return p.db.Update(func(tx *bolt.Tx) error {
		snapshots := tx.Bucket(dataplaneSnapshotBucket)
		search := tx.Bucket(dataplaneSearchBucket)
		cells := tx.Bucket(dataplaneCellIndexBucket)
		if snapshots != nil {
			if err := snapshots.Delete(cellKey); err != nil {
				return err
			}
		}
		if search != nil && cells != nil {
			return deleteCellIndex(search, cells, cellKey)
		}
		return nil
	})
}

func (p *boltSnapshotPersistence) SearchNamePrefix(prefix string, limit int) ([]dataplaneSearchRow, error) {
	if p == nil || p.db == nil || limit <= 0 {
		return nil, nil
	}
	seek := []byte(strings.ToLower(prefix))
	rows := make([]dataplaneSearchRow, 0, limit)
	err := p.db.View(func(tx *bolt.Tx) error {
		b := tx.Bucket(dataplaneSearchBucket)
		if b == nil {
			return nil
		}
		c := b.Cursor()
		for key, value := c.Seek(seek); key != nil && bytes.HasPrefix(key, seek) && len(rows) < limit; key, value = c.Next() {
			var row dataplaneSearchRow
			if err := json.Unmarshal(value, &row); err != nil {
				return err
			}
			rows = append(rows, row)
		}
		return nil
	})
	return rows, err
}

type dataplaneSearchRow struct {
	Cluster    string `json:"cluster"`
	Kind       string `json:"kind"`
	Namespace  string `json:"namespace,omitempty"`
	Name       string `json:"name"`
	ObservedAt string `json:"observedAt,omitempty"`
}

func deleteCellIndex(search, cells *bolt.Bucket, cellKey []byte) error {
	raw := cells.Get(cellKey)
	if raw == nil {
		return nil
	}
	var keys [][]byte
	if err := json.Unmarshal(raw, &keys); err != nil {
		return err
	}
	for _, key := range keys {
		if err := search.Delete(key); err != nil {
			return err
		}
	}
	return cells.Delete(cellKey)
}

func searchRowsFromSnapshot(cluster string, kind ResourceKind, namespace string, snap any) []dataplaneSearchRow {
	v := reflect.ValueOf(snap)
	if v.Kind() == reflect.Pointer {
		if v.IsNil() {
			return nil
		}
		v = v.Elem()
	}
	if v.Kind() != reflect.Struct {
		return nil
	}
	items := v.FieldByName("Items")
	if !items.IsValid() || items.Kind() != reflect.Slice {
		return nil
	}
	observedAt := ""
	if meta := v.FieldByName("Meta"); meta.IsValid() && meta.Kind() == reflect.Struct {
		if observed := meta.FieldByName("ObservedAt"); observed.IsValid() && observed.CanInterface() {
			if ts, ok := observed.Interface().(time.Time); ok && !ts.IsZero() {
				observedAt = ts.UTC().Format(time.RFC3339Nano)
			}
		}
	}
	rows := make([]dataplaneSearchRow, 0, items.Len())
	for i := 0; i < items.Len(); i++ {
		item := items.Index(i)
		if item.Kind() == reflect.Pointer {
			if item.IsNil() {
				continue
			}
			item = item.Elem()
		}
		if item.Kind() != reflect.Struct {
			continue
		}
		name := stringField(item, "Name")
		if name == "" {
			continue
		}
		ns := stringField(item, "Namespace")
		if ns == "" {
			ns = namespace
		}
		rows = append(rows, dataplaneSearchRow{
			Cluster:    cluster,
			Kind:       string(kind),
			Namespace:  ns,
			Name:       name,
			ObservedAt: observedAt,
		})
	}
	return rows
}

func stringField(v reflect.Value, name string) string {
	f := v.FieldByName(name)
	if !f.IsValid() || f.Kind() != reflect.String {
		return ""
	}
	return f.String()
}

func snapshotKey(cluster string, kind ResourceKind, namespace string) []byte {
	return []byte(strings.Join([]string{keyPart(cluster), keyPart(string(kind)), keyPart(namespace)}, "/"))
}

func searchIndexKey(row dataplaneSearchRow) []byte {
	normalized := strings.ToLower(row.Name)
	return []byte(strings.Join([]string{
		normalized,
		keyPart(row.Cluster),
		keyPart(row.Kind),
		keyPart(row.Namespace),
		keyPart(row.Name),
	}, searchKeySeparator))
}

func keyPart(s string) string {
	return base64.RawURLEncoding.EncodeToString([]byte(s))
}

func markPersistedSnapshot[I any](snap *Snapshot[I], maxAge time.Duration) bool {
	if snap == nil || snap.Meta.ObservedAt.IsZero() {
		return false
	}
	if maxAge > 0 && time.Since(snap.Meta.ObservedAt) > maxAge {
		return false
	}
	snap.Meta.Freshness = FreshnessClassStale
	if snap.Meta.Degradation == "" || snap.Meta.Degradation == DegradationClassNone {
		snap.Meta.Degradation = DegradationClassMinor
	}
	if snap.Meta.Coverage == "" {
		snap.Meta.Coverage = CoverageClassUnknown
	}
	if snap.Meta.Completeness == "" {
		snap.Meta.Completeness = CompletenessClassUnknown
	}
	return true
}

func persistedSnapshotFallback[I any](persisted Snapshot[I], live Snapshot[I]) Snapshot[I] {
	if live.Err != nil {
		persisted.Err = live.Err
	}
	if persisted.Err == nil {
		n := NormalizeError(errors.New("live refresh failed; using persisted dataplane snapshot"))
		persisted.Err = &n
	}
	persisted.Meta.Freshness = FreshnessClassStale
	persisted.Meta.Degradation = WorstDegradation(persisted.Meta.Degradation, DegradationClassMinor)
	return persisted
}

func persistenceOpenError(err error) error {
	if err == nil {
		return nil
	}
	return fmt.Errorf("open dataplane persistence: %w", err)
}
