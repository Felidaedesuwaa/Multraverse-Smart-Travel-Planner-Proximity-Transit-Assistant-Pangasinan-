# Super Admin provisioning and audit

The implementation follows this repository's `server/src` folder structure and
uppercase stored roles: `SUPERADMIN`, `ADMIN`, `LGU`, `EXPLORER` (existing `PRO`
is preserved). `requireRole(['superadmin'])` accepts lowercase role names.

## Access decision

Super Admin is a separate role, not an implicit Admin permission superset. Only
Super Admins can create/list managed LGU and Admin accounts or read audit logs.
Only Admins can use existing content approval routes. Super Admins cannot access
Admin or LGU navigators; their root navigator is registered exclusively. Public
registration still creates Explorers. Privileged account creation never accepts
role, creator, password hash, or extra fields from the request body.

## Bootstrap

From the repository root:

```sh
npm run seed:superadmin --prefix server
```

Creates `superadmin@multraverse.ph` / `Superadmin123!` only when no Super Admin
exists, with `createdBy: null`. Existing credentials are never reset and an
existing Explorer/Admin email is never promoted. Configure
`SUPERADMIN_SEED_EMAIL` and `SUPERADMIN_SEED_PASSWORD` to override defaults.
A custom password is required when `NODE_ENV=production`.

A partial unique index on User.role for SUPERADMIN ensures exactly one bootstrap
Super Admin, including concurrent seed executions. There is no API for creating
or promoting Super Admins. Existing direct development seed scripts remain
operator-only database tools; they are not exposed through the app API.

No migration is needed: old users have no creator and display as seed/legacy
accounts. The new schema adds optional `createdBy` and an AuditLog collection.
Indexes initialize at server startup. The bootstrap seed has not been run merely
by installing this code.

## API

All these endpoints require a Super Admin bearer token:

| Method | Path | Input / result |
| --- | --- | --- |
| POST | `/api/users/lgu-accounts` | `{email,password,municipality}`; canonical municipality from the 48-name catalog |
| POST | `/api/users/admin-accounts` | `{email,password}` |
| GET | `/api/users/lgu-accounts` | LGU public fields, municipality, createdAt, populated createdBy email/role |
| GET | `/api/users/admin-accounts` | Admin public fields and creator attribution |
| GET | `/api/audit-logs` | `page=1&limit=25&action=approve_place&actor=<ObjectId>`; all filters optional |

Account creation returns 201; duplicate normalized emails return 409, including
concurrent requests. Invalid fields, weak passwords, or misspelled municipalities
return 400. Passwords require at least 8 characters, uppercase, lowercase and a
number, and at most 72 UTF-8 bytes. Symbols such as `!` are supported. Hashes and
plaintext passwords are never returned, logged, or put into audit metadata.
Managed accounts can sign in immediately; the assigned initial password is given
to their officer by the provisioning administrator.

Account + audit writes use a MongoDB transaction and therefore require Atlas or
a replica set (including local development). If audit insertion fails, no new
account is committed. No email delivery is triggered by provisioning.

Audit results are `{items,total,page,limit,totalPages}`, sorted by createdAt and
_id descending. Limit is bounded to 100. Actor and targetUser populate only
email/role (and normal MongoDB IDs). Deleted account references display as deleted
or unavailable; audit events are not removed by account deletion. No API is
provided for updating or deleting audit events.

## Events

- `create_lgu_account`, `create_admin_account`
- `approve_place`, `reject_place`
- `approve_geofence`, `reject_geofence`
- `approve_local_food`, `reject_local_food`
- `approve_route_price`, `reject_route_price`
- `approve_transit_route`, `reject_transit_route`

Content events record actor, itemId and municipality; approved deletion requests
also record `metadata.deletion: true`. Failed/duplicate reviews do not log success.
As requested, the existing approval mutations are unchanged: audit insertion
happens immediately after the successful mutation. If that insertion fails, the
request returns an error but the approval has already taken effect. These content
writes are not transactionally coupled to logging. Old events are not backfilled.

## Frontend

`SuperAdminLayout.jsx` has one responsive sidebar and nested JSX screens:
`SuperAdminDashboard`, `SuperAdminUsers`, `SuperAdminCreateLGU`,
`SuperAdminCreateAdmin`, and `SuperAdminAuditLog`. Municipality selection uses
`src/data/lguMunicipalities.js`. Shared Cards, badges, buttons, toggles and stat
cards are reused; results use dismissible accessible toast notifications.
The existing auth store persists the complete SUPERADMIN profile through login,
refresh and offline initialization, and clears it on logout.

## Checks

```sh
npm run test:superadmin --prefix server
npx expo export --platform web --output-dir .tmp/superadmin-web
```

The API suite creates a random isolated database and removes its records in a
finally block. Set `SUPERADMIN_TEST_MONGODB_URI` to override MONGODB_URI. Tests cover
role gates, duplicate races, validation, transactional audit rollback, bootstrap
idempotence/concurrency, all five approval/rejection types, pagination and filters,
public fields and stale JWT roles. Empty test collections can remain in Atlas.
