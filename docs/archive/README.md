# Archived documentation

This folder holds **historical** stage execution notes, migration punchlists, and the pre-consolidation architecture principles file. They were accurate for their time but mixed status updates with reference material.

**Current documentation** (maintain these when behavior changes):

| Document | Role |
|----------|------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Product architecture and principles |
| [DATAPLANE.md](../DATAPLANE.md) | Read-side dataplane behavior and metadata |
| [API_READ_OWNERSHIP.md](../API_READ_OWNERSHIP.md) | Route-by-route map of GET / read-shaped APIs |
| [UI_UX_GUIDE.md](../UI_UX_GUIDE.md) | UI contracts |

### Archived files

- `ARCHITECTURE_PRINCIPLES.md` — superseded by `../ARCHITECTURE.md`
- `STAGE5_STATUS.md` — dataplane status snapshot; factual content merged into `../DATAPLANE.md` and `../API_READ_OWNERSHIP.md`
- `STAGE5C_READ_SUBSTRATE.md` — canonical route map; superseded by `../API_READ_OWNERSHIP.md`
- `STAGE5_CLOSURE.md` — closure narrative and historical Stage 5A notes
- `STAGE5C_FINAL_PUNCHLIST.md` — execution checklist from migration
- `STAGE5C_MIGRATION_INVENTORY.md` — migration buckets and rationale

Cross-links between archived files may still point at old `docs/*.md` paths; use the table above for current paths.
