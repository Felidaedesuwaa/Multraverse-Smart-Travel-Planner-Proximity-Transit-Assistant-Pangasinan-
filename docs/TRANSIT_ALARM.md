# Transit alarm

The screen retains the existing header and searches `POST /api/ai/transit/search`.
Express selects published ACTIVE route records with a source URL, verification
date and ordered `stopLocations`; FastAPI `/transit/search` selects and orders
those candidates deterministically. No language model invents transport facts.

Each stop location needs `name`, `areaId` (a Pangasinan municipality ID), `lat`
and `lng`. Coordinates must fall within that municipality's bundled boundary.
Only the published travel direction is supported. Publish a separate record for
the reverse direction; do not assume a service runs both ways. Fares remain
unconfirmed because the current transit schema has no verified point-to-point fare.

The read-only database check during implementation returned zero ACTIVE routes.
Supply researched operator/municipal records before expecting journey results.
Do not populate this collection with demonstration operators or town centroids
presented as stop coordinates. Existing MongoDB collection validators may need
the normal database hardening migration to allow the new stopLocations field.

Restart Express and FastAPI after installation. No new packages are required.
GPS monitoring uses expo-location in the foreground and stops on app background
or screen unmount. An alarm requires a position less than 30 seconds old and
accuracy at most min(100 m, radius / 2); the entire GPS uncertainty circle must
be inside the radius. Alerts fire once per activation. Proximity distances are
straight-line distances, with no fabricated road ETA or vehicle telemetry.

Vibration uses React Native Vibration (device/browser support varies). Sound
uses browser Web Audio; browser notifications require permission. Native sound
and push need a future native notification integration. This screen does not
provide background alarms.

Validation: `npm run build` in server, `npm run build:web` at the root,
`ai-service/venv/Scripts/python.exe -m unittest discover -s ai-service -p test_transit.py`.
Actual GPS arrival alerts still require testing on a device in Pangasinan.
