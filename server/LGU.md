# Municipal tourism accounts

The backend lives in `server/src`. Roles follow the existing uppercase convention:
`LGU`, `ADMIN`, `EXPLORER`, and the existing `PRO`. `requireRole(['lgu'])` accepts
case-insensitive role names. Public signup still creates only Explorer accounts.

## Setup

From the repository root:

```sh
npm run migrate:lgu --prefix server
npm run seed:lgu --prefix server
```

The migration is idempotent and marks legacy catalog records as approved. It adds
municipality/approval indexes and review revisions. It does not guess municipal
ownership from addresses or route endpoints. Existing Place municipality values
are retained; an administrator must assign exact municipality strings to legacy
food, fare, geofence, and transit records before LGUs can manage them. Use the same
spelling on the account and resources (for example `Dagupan`). LGUs cannot assign
or change that ownership, including through profile updates.

The seed creates six sample accounts, all with password `Lgu123!`:

| Account | Municipality |
| --- | --- |
| lgu.dagupan@multraverse.ph | Dagupan |
| lgu.alaminos@multraverse.ph | Alaminos |
| lgu.urdaneta@multraverse.ph | Urdaneta |
| lgu.sancarlos@multraverse.ph | San Carlos |
| lgu.malasiqui@multraverse.ph | Malasiqui |
| lgu.bolinao@multraverse.ph | Bolinao |

Existing accounts/passwords, including `lgu@multraverse.ph`, are preserved.
Override the batch with **both** `LGU_SEED_EMAIL` and `LGU_SEED_MUNICIPALITY` to
create one account in any of the 48 LGUs. `LGU_SEED_PASSWORD` overrides the sample
password and is required in production. The seed passes role `lgu`; the existing
User setter stores `LGU` for compatibility with navigation and authorization.
Migration and seed scripts are supplied separately and are not run at startup.

## Approval contract

Every catalog model has `approvalStatus`: `pending`, `approved`, or `rejected`.
This is separate from TransitRoute's existing operational `status` (`ACTIVE` or
`INACTIVE`) so existing Admin/planner functionality continues to work.

All LGU creates and edits set pending status, authenticated municipality,
submitter and submission time. Edits immediately hide the record from Explorer
catalogs, planners and AI context until approval. Rejected entries stay hidden
and can be edited/resubmitted. This implementation edits records in place; it
does not preserve a previously approved version during review. Existing offline
plans and saved trip snapshots are not retroactively rewritten.

DELETE creates a pending deletion request and hides the record. Approval removes
it; rejection keeps it hidden with feedback. Editing/resubmitting cancels the
deletion request. Admin review checks the displayed `reviewRevision` atomically;
changed or already reviewed submissions return 409 and must be refreshed.

## API

Resources: `places`, `geofences`, `foods`, `route-prices`, `transit-routes`.
All routes require `Authorization: Bearer <token>`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/lgu/:resource` | Own municipality; optional `?status=pending` (or approved/rejected) |
| GET | `/api/lgu/:resource/:id` | Read an own-municipality record |
| POST | `/api/lgu/:resource` | Submit allowed model fields |
| PUT | `/api/lgu/:resource/:id` | Edit/resubmit allowed model fields |
| DELETE | `/api/lgu/:resource/:id` | Request deletion |
| GET | `/api/admin/approvals/:resource` | Admin queue; default pending, optional status filter |
| POST | `/api/admin/approvals/:resource/:id/approve` | `{ "revision": 0 }` using the record's current reviewRevision |
| POST | `/api/admin/approvals/:resource/:id/reject` | `{ "revision": 0, "reason": "Please verify the fare" }` |

Allowed payload fields are centralized in `src/lib/lguResources.ts`. Unknown
fields, municipality reassignment and moderation-field writes are rejected.
Role and municipality are read from MongoDB on every request, so old JWT claims
cannot restore revoked privileges. Cross-municipality IDs return 404.

## Frontend and verification

LGU login opens `/lgu` with its own responsive sidebar and five resource editors.
The persisted Zustand user includes role and municipality, also exposed as store
fields. Admins can open LGU approvals from their sidebar or the mobile navigation
bar. Components remain JSX and reuse the existing shared visual components.

```sh
npm run test:lgu --prefix server
npm run test:planner --prefix server
npx expo export --platform web --output-dir .tmp/lgu-web
```

LGU API checks use a randomly named isolated database and remove its records in
`finally`; no application data is touched. The Atlas role need not permit dropping
databases. Set `LGU_TEST_MONGODB_URI` to override the configured connection. Empty
test database collections may remain. `scripts/cleanup-lgu-test.cjs` accepts only
names matching the generated LGU test-database pattern for interrupted runs.

## 48-LGU dashboard audit

- `src/pages/LGUDashboard.jsx`: one shared editor, no hardcoded Dagupan data; it
  resolves config from `authStore.user.municipality` and remounts editors on user,
  municipality, or resource changes to discard stale rows/drafts.
- `src/components/LGUSidebar.jsx` and `src/components/LGUPage.jsx`: municipality
  labels resolve from the logged-in user; neither selects a default city.
- `src/components/LGUMunicipalityMap.jsx`: one new vector map for all LGUs;
  geographic center and zoom come from the config, without loading another LGU's
  private records. Invalid scopes show an account-assignment message.
- `src/data/lguMunicipalities.js`: all 48 canonical names, kind, area IDs,
  `{lat, lng}` map centers, and default zooms. Centers are bounding-box midpoints
  of **all** boundary polygons (including islands), not municipal-hall locations.
  Source is the same 2023 Philippines JSON Maps dataset and MIT attribution as
  `pangasinanMap.json`; see `src/data/PANGASINAN_MAP_SOURCES.md`.
- `src/data/lguResources.js`, `src/lib/api.js`, `src/store/authStore.js`, and
  `src/App.jsx`: shared resource definitions, calls, persisted account and routing;
  no per-municipality resource IDs or query filters.
- `server/src/routes/lgu.ts`: all five models use `req.municipality`, the trusted
  equivalent of `req.user.municipality` assigned by authentication from MongoDB.
  Unknown query parameters (including municipality) and body ownership fields are
  rejected. Every read/update/delete and referenced transit route uses that scope.
- `server/src/middleware/auth.ts` and `server/src/models/User.ts`: invalid/missing
  Pangasinan scopes fail closed; new account municipality aliases (e.g. Dagupan
  City) normalize to the canonical catalog name. Old raw noncanonical account
  values need correction before access; resource ownership is never guessed.
- `server/seeds/seedLGU.ts`: replaced the single-city default with six fixtures in
  `server/src/data/lguSeedAccounts.ts`; no dashboard components are duplicated.

Run `node scripts/check-lgu-municipalities.cjs` to check all 48 geographic viewports,
zoom, aliases, four cities, and parity with the existing backend catalog. The LGU
API suite additionally exercises all five resource types for each of six scopes,
including foreign IDs and municipality injection through both body and query.
