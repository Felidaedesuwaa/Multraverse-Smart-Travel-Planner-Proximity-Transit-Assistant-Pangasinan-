# MongoDB/Mongoose migration audit

Audit date: 2026-09-05. The Prisma schema contains **11 models**, not 12. The request's named list also contains 11 data models plus `index.js` (an export barrel).

| Prisma model   | Mongoose model | Relationships / indexes                                                |
| -------------- | -------------- | ---------------------------------------------------------------------- |
| `User`         | `User`         | unique lowercase `email`; owns trips, saved places, and budget entries |
| `Trip`         | `Trip`         | `userId` → `User`; virtual `tripStops`                                 |
| `TripStop`     | `TripStop`     | `tripId` → `Trip`; indexed                                             |
| `SavedPlace`   | `SavedPlace`   | `userId` → `User`; indexed                                             |
| `BudgetEntry`  | `BudgetEntry`  | `userId` → `User`; optional `tripId` → `Trip`                          |
| `TransitRoute` | `TransitRoute` | standalone                                                             |
| `Geofence`     | `Geofence`     | standalone                                                             |
| `Place`        | `Place`        | standalone knowledge-base record                                       |
| `RoutePrice`   | `RoutePrice`   | standalone knowledge-base record                                       |
| `LocalFood`    | `LocalFood`    | standalone knowledge-base record                                       |
| `Phrasebook`   | `Phrasebook`   | standalone knowledge-base record                                       |

MongoDB creates ObjectIds as `_id`. Every schema serializes `_id` as the previous API-compatible `id` string, and hides `_id` in JSON responses. JWT payloads store `User._id.toString()`.

## API routes audited

`/api/auth`, `/api/trips`, `/api/budget`, `/api/places`, `/api/transit-routes`, `/api/geofences`, `/api/users`, `/api/ai`, `/api/knowledge`, and `/api/health`.

## Current knowledge ingestion

The historical demo seeds were removed. `npm run seed:phrases` runs
`prisma/seedPhrasebookV2.ts` (95 source phrases); `npm run seed:city-guides` projects
the seven selected local guides into Place/LocalFood catalogs.
`npm run seed` runs these two commands. Account bootstrap is separate.

## Atlas checklist

1. Create an M0 Atlas cluster at mongodb.com/atlas.
2. Add your development IP address (or `0.0.0.0/0` only for temporary development access) and a database user.
3. Put its URI in `server/.env` as `MONGODB_URI`; never commit credentials.
4. Install MongoDB Compass locally and connect using the same URI.
5. Run `npm run seed` from `server/`.
