> Historical audit: the current layout is documented in [DATABASE-DESIGN.md](DATABASE-DESIGN.md). Budget settings and trip stops are now embedded; the old counts and 17-collection plan below are historical.

# Database audit and hardening review

Atlas was inspected read-only on 2026-09-26. No Atlas documents, collections, indexes, or validators were changed. The audit table was shown before migration code was written. Counts are a snapshot, not a live dashboard.

## Collection audit

| Collection | Model in `src/models/` at audit | Route/middleware usage | Documents | Recommendation | Reason |
|---|---|---|---:|---|---|
| aisettings | AISettings | ai, planner | 0 | Keep | Optional global AI switches; code supplies defaults |
| auditlogs | AuditLog | auditLogs, approvals; managedAccounts helper | 0 | Keep | Administrative audit trail |
| authlimits | No; model existed in `src/lib/authLimits.ts` | auth, users through helper | 0 | Keep | TTL rate-limit counters; moved model into models/ |
| budgetentries | BudgetEntry | budget, trips | 18 | Keep | Individual expenses, optionally associated with trips |
| budgetsettings | BudgetSettings | budget | 3 | Keep | Unique per-user monthly budget and savings preferences |
| geofences | Geofence | geofences, planner, analytics; LGU resource registry | 7 | Keep | Advisory zones |
| localfoods | LocalFood | knowledge, ai, planner; LGU registry | 10 | Keep | Local food catalog |
| pendingregistrations | PendingRegistration | auth through registrationVerification | 0 | Keep | TTL registration challenges, not permanent accounts |
| phrasebooks | Phrasebook | ai | 95 | Keep | Verified translations |
| places | Place | places, knowledge, ai, planner; LGU registry | 35 | Keep | Canonical destination catalog |
| plannerdrafts | PlannerDraft | planner | 0 | Keep | TTL drafts, distinct from saved trips |
| routeprices | RoutePrice | knowledge, ai, planner; LGU registry | 19 | Keep | Fares between destinations, distinct from transit services |
| savedplaces | SavedPlace | places, planner | 14 | Keep | User bookmarks/reviews and historical snapshots |
| transitroutes | TransitRoute | transitRoutes, planner, analytics; LGU registry | 8 | Keep | Service operation metadata |
| trips | Trip | trips, planner, analytics | 10 | Keep | Saved itineraries |
| tripstops | TripStop | trips, planner; Trip populate | 3 | Keep | Ordered itinerary stops |
| users | User | auth, users, analytics, planner; authentication middleware | 12 | Keep | Accounts and authorization |

No production orphan collection or unused model was found. `_helpers.ts` and `_moderation.ts` are shared schema definitions, not standalone models. Empty TTL/configuration collections are not evidence of dead features. No merges are recommended: budget settings/expenses, rate limits/audit events, places/bookmarks, drafts/trips, and fares/transit services have distinct lifecycles and ownership.

## Test databases and cleanup proposal

The following databases each contain 15 collections, all empty:

- `multraverse_lgu_test_57137a02d811d50b`
- `multraverse_lgu_test_a1d171e8ca73f3fd`
- `multraverse_lgu_test_f7276454a00f16e6`

`scripts/check-lgu-api.cjs` generates precisely this prefix plus 16 random hexadecimal characters. It connects with a `dbName` override and deletes documents in its cleanup block, leaving collections and databases behind. `scripts/cleanup-lgu-test.cjs` likewise deletes documents rather than dropping the database. No seed or environment setting targets these specific names. The existing `server/.env` and `server/.env.example` MONGODB_URI values target `multraverse`; the audit also checks root/src environment files without printing credentials.

Approved destructive scope: the user subsequently approved removal of only those three exact empty test databases. Keep all 17 production collections. `scripts/remove-approved-test-databases.cjs` defaults to dry-run, uses an exact allowlist, checks every target before the first drop, and rechecks emptiness immediately before each drop.

Execution attempt: all three databases still contained 15 empty collections. Atlas rejected the first `dropDatabase` operation with MongoServerError code 8000: the configured database user lacks `dropDatabase` permission. No database was removed. After granting that permission on the three approved databases, rerun from `server/`:

```powershell
node scripts/remove-approved-test-databases.cjs --apply
```

The existing destructive test/cleanup scripts have not been run during this pass. Production validation/data-remediation blockers remain unchanged.

## Existing data requiring a decision

The migration preflight reports:

| Collection | Issue | Affected documents |
|---|---|---:|
| budgetentries | `category` violates the new required enum | 15 |
| trips | `userId` points to a missing user | 6 |
| savedplaces | `userId` points to a missing user | 13 |
| budgetentries | `userId` points to a missing user | 16 |
| budgetsettings | `userId` points to a missing user | 1 |

The 36 missing-owner records are not necessarily disposable. Counts overlap with the category issue. Do not reassign them to an arbitrary account or delete them automatically. Review record provenance to choose restoration, reassignment to a verified owner, retention in an archive, or deletion. Budget categories also need an explicit mapping, rather than silently converting unknown categories to `Others`. The migration refuses **all writes** while these blockers remain.

No current Place or Geofence has a complete numeric latitude/longitude pair. Existing display strings are not parsed into guessed locations. GeoJSON backfill currently affects zero documents; coordinates must be populated from verified data before geospatial queries become useful.

## Model changes

Every model now calls `_hardening.ts` before compilation. This enforces `strict: 'throw'`, `strictQuery: true`, string limits, strict scalar types, finite numeric bounds, integer counts, bounded arrays/objects, reference checks for newly assigned foreign keys, and validation on query updates. `autoIndex`/`autoCreate` are disabled so schema/index deployment is explicit. Password and verification hashes are stripped from JSON serialization, including newly created documents.

| Model file | Additional changes |
|---|---|
| AISettings.ts | Singleton `_id` enum; common rules |
| AuditLog.ts | Actor/target reference validation; preserves audit indexes |
| AuthLimit.ts (new) | Model moved out of helper; required bounded key/count, TTL preserved |
| BudgetEntry.ts | Budget category enum matching the UI; ownership/trip indexes |
| BudgetSettings.ts | Bounded amounts; preserves unique user constraint |
| Geofence.ts | Latitude/longitude ranges; derived GeoJSON point and 2dsphere index |
| LocalFood.ts | String/price bounds; moderation/list indexes |
| PendingRegistration.ts | Hashes use select:false; bcrypt/hash lengths; TTL and unique indexes retained |
| Phrasebook.ts | String bounds; category/Filipino list index |
| Place.ts | Derived GeoJSON point; name/list/moderation indexes |
| PlannerDraft.ts | Adds User ref; bounded plan object; TTL retained |
| RoutePrice.ts | Reference and numeric validation; route-area compound index |
| SavedPlace.ts | Bounded review/photo data; public/user/place/name indexes |
| TransitRoute.ts | Counts and arrays bounded; status and update-time indexes |
| Trip.ts | Nonnegative finite budget/spending; status enum preserved; user/date index |
| TripStop.ts | Integer order/day; Trip/Place reference checks; trip/order index |
| User.ts | Password hash select:false; reference validation; role/date index |

Mongoose `strict: true` strips unknown fields; `'throw'` is intentionally stronger and rejects them. See [Mongoose strict mode](https://mongoosejs.com/docs/guide.html#strict). MongoDB rules use `additionalProperties: false`, including `_id` and `__v` as valid fields, following [MongoDB JSON Schema guidance](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/json-schema-tips/).

Foreign-key existence cannot be expressed using MongoDB `$jsonSchema`. ObjectId types are checked in MongoDB; existence is checked by Mongoose with the active transaction session. Unmodified historical references can outlive deleted catalog records/accounts. These checks are not SQL foreign keys: raw-driver writes and concurrent deletions can still produce dangling references. Run the preflight periodically. Flexible internal plan/details/audit metadata remain objects, not invented closed schemas; their application size limit is stricter than MongoDB's document limit.

## Request and query changes

- `middleware/input.ts` recursively removes operator/dotted/prototype keys and rejects the request with 400 before handlers run. It safely handles Express 5's read-only query getter and rejects repeated/object-valued query parameters. The middleware is installed globally and on routers used in isolated tests.
- Every POST/PUT/PATCH handler has typed route validation through an explicit editable-field contract; existing registration/profile/planner semantic validators remain in place. Model-backed input is checked before Mongoose can coerce types. No extra dependency is required.
- Saved-place updates cannot change owner, database IDs, moderation, timestamps, or review-count fields. User ratings and notes remain editable. Budget entries can only link to the caller's own trip.
- Login and account deletion explicitly select password hashes. Verification explicitly selects the code/password hashes only at their necessary steps.
- No route uses `$where` or raw client `$expr`. User-controlled regex text is escaped; translation field names come from the existing language allowlist. Generic resource names come from a fixed registry.
- List routes accept `page` (1–10000) and `limit` (1–200), defaulting to 100. The pre-existing audit endpoint retains its tighter limit of 100. Stable `_id` sort tie-breakers were added. `src/lib/api.js` follows pages for existing screens to preserve complete-list behavior.
- Planner catalog responses page destinations, fares and foods. Internal deterministic planning has a 5000-record-per-input capacity guard and fails explicitly instead of silently truncating calculations. AI prompt context is bounded.
- No loop issuing one `findById()` per result was found. Populate already batches references. Trip spending now uses a single grouped aggregation for the requested page instead of loading every expense and repeatedly scanning it in JavaScript. Analytics now aggregates/counts in MongoDB instead of loading entire collections.
- Indexes target owner/date lists, approval queues, role/date lists, public bookmarks, trip stops, expense lookup, catalog ordering and geospatial points. Existing indexes are retained. Unanchored case-insensitive substring regex searches cannot be fixed by adding ordinary indexes to every searched field; consider a dedicated search index if those bounded AI/catalog searches become a bottleneck.

## Review and migration commands

From `server/`:

```powershell
npm.cmd run db:audit
npm.cmd run build
node scripts/harden-database.cjs --dry-run --database=multraverse --out=database-preflight.json
npm.cmd run test:hardening
```

`database-preflight.json` contains the full BSON schemas, proposed indexes, existing index definitions, previous validators/options, invalid-document sample IDs (no document contents), and reference counts. It contains no MongoDB URI, passwords, or hashes. The audit script uses only the native driver and does not initialize application models.

After the existing-data decisions are implemented and a fresh dry-run has zero blockers, the explicit apply command is:

```powershell
node scripts/harden-database.cjs --apply --database=multraverse --out=database-before-apply.json --backfill-geo
```

Apply has **not** been run. It installs `validationLevel: strict` / `validationAction: error` validators and creates only missing indexes. Optional GeoJSON backfill derives `[longitude, latitude]` only from existing valid numeric pairs. No collections, documents, or indexes are dropped. Unknown flags and conflicting apply/dry-run flags are rejected. An exact database name is required for apply. Preserve the before-apply report under a fresh filename: collection DDL is not transactional, and a permissions/index-build failure can leave a partially completed deployment. Fix the cause and rerun; existing matching indexes are skipped. Previous validators/options in the report provide the information for a reviewed rollback.

The migration checks existing data using `$nor: [{ $jsonSchema: ... }]`, as documented by [MongoDB](https://www.mongodb.com/docs/manual/core/schema-validation/use-json-schema-query-conditions/). Adding a validator does not repair existing data, which is why preflight blocks the write phase.

## Validation performed

- TypeScript server build passed.
- `check-database-hardening.cjs`: schema constraints, secret selection, async reference checks with a stubbed repository, GeoJSON ordering, Express 5 sanitization, operator/object/array injection rejection, editable fields and pagination passed.
- Existing planner calculation and planner HTTP contract checks passed.
- Existing registration validation and profile validation checks passed.
- Client API JavaScript syntax and `git diff --check` passed.
- Atlas read-only preflight successfully parsed/evaluated all 17 proposed BSON validators and reported the data blockers above.

Live database write/rejection integration tests were not run: existing auth/LGU/superadmin suites delete their temporary records during cleanup, and the user has not approved deletion. Their setup now explicitly provisions indexes in their randomly named test database; assertions that inspect hashes explicitly select those fields. Strict route contracts now test rejection of extra account fields. Applying validators, exercising actual MongoDB write rejection, and the approved cleanup remain rollout steps after review.
