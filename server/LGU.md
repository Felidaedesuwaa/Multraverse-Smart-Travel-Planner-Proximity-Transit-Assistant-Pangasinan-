# Municipal tourism accounts

The backend lives in `server/src`. Roles follow the existing uppercase convention:
`LGU`, `ADMIN`, `EXPLORER`, and the existing `PRO`. `requireRole(['lgu'])` accepts
case-insensitive role names. Public signup still creates only Explorer accounts.

## Setup

From the repository root:

```sh
npm run migrate:lgu --prefix server
```

The migration is idempotent and marks legacy catalog records as approved. It adds
municipality/approval indexes and review revisions. It does not guess municipal
ownership from addresses or route endpoints. Existing Place municipality values
are retained; an administrator must assign exact municipality strings to legacy
food, fare, geofence, and transit records before LGUs can manage them. Use the same
spelling on the account and resources (for example `Dagupan`). LGUs cannot assign
or change that ownership, including through profile updates.

The disabled demo account seed was removed. Create LGU accounts through the
existing administrator workflow. `server/src/data/lguSeedAccounts.ts` remains
only as fixtures for the isolated API tests; it does not provision live accounts.

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
- `server/src/data/lguSeedAccounts.ts`: isolated API-test fixtures only.

Run `node scripts/check-lgu-municipalities.cjs` to check all 48 geographic viewports,
zoom, aliases, four cities, and parity with the existing backend catalog. The LGU
API suite additionally exercises all five resource types for each of six scopes,
including foreign IDs and municipality injection through both body and query.

## Itinerary images and emergency reserve

Places and local food accept an optional compressed JPEG image (up to 700,000
characters). New images follow the existing Admin approval workflow. Approved
entries in the seven supported planner areas appear in Step 3; uploaded photos
replace guide photos for matching names. Descriptions come from approved LGU
entries or the source guide. The planner keeps the selected hotel even across
repeat plans and multiplies the Step 2 reference rate by rooms and nights.
Emergency reserve is 10% of the total trip budget and is included in totals.

For existing databases with strict validators, build the server, then run:

```sh
node server/scripts/migrate-itinerary-media.cjs
node server/scripts/migrate-itinerary-media.cjs --apply --database=EXACT_NAME
```

The first command validates without changing data. The second adds only photo
and guided snapshot fields to existing validators after checking stored records.

## Category and budget selection

Recent itinerary history is a preference for variety, not a permanent exclusion.
Matching visits can be reused so repeat generation does not leave only a hotel.
Food Trip or Local Food shows every food listed for the selected area, including
approved LGU entries. The schedule uses a small tasting shortlist; the complete
list is preserved in the guided snapshot and PDF. Food-only trips exclude
unrelated attractions. Mixed selections include attractions matching selected
categories. Known group admission costs must fit the allowance remaining after
meals, transport, the selected hotel and the 10% emergency reserve; unpriced
visits stay explicitly unconfirmed. The model receives this budget context, and
the server enforces categories and costs even when AI ranking is unavailable.

The planner starts with no traveler type, travel style, budget tier or lodging
selection. No lodging is an explicit user choice. Trip types and activities each
require 1?3 selections. Step validation blocks empty or invalid required fields
without silently replacing numeric input, and the API repeats the validation.
Dates must be today or later in Manila; travelers/rooms are whole numbers 1?30,
trip length is 1?7 days, and every selected transport needs a complete fare or
allowance estimate. Success feedback appears after steps, generation, saving and
starting a PDF download. Run `node scripts/check-itinerary-validation.cjs` after
building the server to verify the form and API rules.
