# Transit alarm

The screen searches `POST /api/ai/transit/search`. Express now selects and sorts
published ACTIVE routes directly from MongoDB. Python and AI are not needed.
Authentication and the existing rate limiter still apply. Routes require a
source URL, verification date and municipality-validated ordered stopLocations.
The map previews the recorded stop rather than guessing its coordinates.

Each stop location needs `name`, `areaId` (a Pangasinan municipality ID), `lat`
and `lng`. Coordinates must fall within that municipality's bundled boundary.
Only the published travel direction is supported. Publish a separate record for
the reverse direction; do not assume a service runs both ways. Fares remain
unconfirmed because the current transit schema has no verified point-to-point fare.

Supply researched operator/municipal records before expecting journey results.
Do not populate this collection with demonstration operators or town centroids
presented as stop coordinates. Existing MongoDB collection validators may need
the normal database hardening migration to allow the new stopLocations field.

## Mobile setup

1. Run `npm ci` at the repository root.
2. Set `EXPO_PUBLIC_API_URL=https://multraverse-backend.vercel.app` in the EAS
   build environment for the preview profile. A phone cannot reach your server
   through localhost. This public URL is not a secret.
3. Run `npx eas-cli build --platform android --profile preview` and install the
   resulting APK. New native packages and permissions require a fresh binary.
   Expo Go and old APKs cannot test background alarms. iOS needs a signed native
   build and Apple signing setup.
4. Sign in, find a verified route, select a stop, and review the map location.
5. Tap Track Route or Resume GPS Tracking. Wait for an accurate fix, choose the
   radius/mode, then Enable Alarm.
6. Allow notifications and background location. On Android grant **Allow all
   the time** in Settings when requested; on iOS grant **Always**. Allow Once
   cannot authorize background trips. Enable precise location services.
7. Lock your screen or navigate within the app: an enabled native alarm keeps
   tracking. Android shows an ongoing tracking notification. Disable Alarm,
   Stop Tracking, logout and account deletion stop tracking. Changing route,
   target, radius or mode cancels the old alarm. Returning restores its settings.

## Behavior and limitations

GPS monitoring uses expo-location and a registered expo-task-manager task.
An alarm requires a position less than 30 seconds old and accuracy at most
min(100 m, radius / 2); the entire uncertainty circle must be inside the radius.
One local OS notification fires per activation, then background tracking stops.
Trips expire after eight hours, checked on the next GPS callback or screen
restoration. GPS failure stops the trip and asks for a retry. No movement history
is stored or uploaded; only the selected route/target and settings persist locally.
After selecting and arming a trip, GPS proximity checks need no internet.
Distances are straight-line proximity, without road ETA or vehicle telemetry.

Sound uses the default OS sound, Vibrate uses an Android vibration channel,
and Notify requests a silent notification. iOS vibration, volume, Do Not Disturb
and notification channel overrides remain device-controlled. Delivery errors
appear when returning to the screen; re-arm to retry. Firebase, OneSignal and
external geocoding services are not required for the existing verified stops.

Web uses foreground GPS and browser notification/audio/vibration support.
Keep the page open; switching away pauses tracking. Closed browsers cannot
provide native background alarms. Vercel updates do not update installed APKs.

Force-closing, rebooting, battery restrictions, denied permissions, muted
notifications and poor GPS can prevent or delay alerts. Test real trips with
the phone locked before relying on this travel aid. See the
[Expo background location requirements](https://docs.expo.dev/versions/latest/sdk/location/#background-location).

## Verification

Run `npm run test:transit` for isolated task and route API checks, then
`npm run build` for Android/iOS/web exports. Device APIs are mocked; these tests
do not establish physical OS delivery. On a phone check: a distant stop does
not fire, approaching fires once, screen lock preserves the trip, cancellation
and logout stop it, denied permissions show an error, and GPS works offline
after arming. Understand force-stop and battery restrictions on each device.
