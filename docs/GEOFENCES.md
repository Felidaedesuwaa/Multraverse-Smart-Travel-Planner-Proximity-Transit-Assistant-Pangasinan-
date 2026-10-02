# Pangasinan geofences

Open **Admin → Geofences** to create a zone, choose its type, set a radius in metres, enter latitude/longitude (or choose a centre on the map), and set its dwell duration. Edit, deactivate or delete saved zones using the table. No example zones or synthetic events are inserted.

The server checks the centre against the bundled 48 municipal polygons and checks the entire circle against the province's exterior edges. Shared municipal edges cancel, allowing circles across municipal boundaries within Pangasinan. A conservative 25 m margin covers rounded polygon coordinates and local distance projection. This uses the application's existing boundary dataset; it is not a cadastral survey. Invalid legacy zones show **Needs setup** and cannot monitor until repaired. They can still be deactivated or deleted.

**Enable GPS alerts** is available in both the admin page and the traveler workspace. Permission is requested only after enabling. Every five seconds the client submits an actual foreground GPS fix to authenticated `POST /api/geofences/track`. Fixes older than 30 seconds, accuracy worse than 100 m, duplicate timestamps and malformed coordinates are rejected. Tracking pauses when the app goes into the background. Background tracking and physical RFID/cellular trackers are not part of this implementation.

Entry requires the entire GPS uncertainty circle to be inside the geofence; exit requires it to be outside. A dwell event fires once per visit after the configured duration. State is separate for each signed-in account (multiple devices signed into the same account share state). Tracking gaps over 30 seconds, disabled zones and edited boundaries reset observations. Only published, active zones with valid Pangasinan boundaries are monitored. An outside-province fix can close an existing visit; it cannot enter a zone.

MongoDB persists observation state, cumulative counts per zone, and each account's last 500 events in `geofencemonitors`. The admin feed shows the latest 100 stored events and Manila timestamps. Concurrent saves use optimistic version checks, so the same fix cannot produce duplicate committed events. Zone deletion preserves history. Startup creates the monitor collection and its unique account index, and adds the optional `dwellSeconds` field to an installed geofence validator while preserving its existing rules. The database account needs index creation and `collMod` permission for that one-time additive setup.

Validation commands:

```powershell
cd server
npm.cmd run build
node scripts/check-geofences.cjs
cd ..
npm.cmd run build:web
```

The check script uses isolated in-memory repositories and exercises the actual Express routes and Mongoose document validation. It checks provincial containment, full-circle containment, CRUD, role restrictions, event transitions, GPS uncertainty, duplicate fixes, observation gaps, independent accounts and retained history. Physical GPS movement and deployed MongoDB permissions still require validation in the target environment.
