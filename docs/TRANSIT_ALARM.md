# Transit alarm

## Test alerts before publishing stop data

Open **Transit Alarm → Test Transit Alerts**. On small screens this panel is
above route planning. It works even when Available Routes is empty.

1. Select **Vibrate**, **Sound**, or **Notify** in the test panel.
2. Allow mobile notification permission using the overlay, then tap **Test alert
   now** to try the selected output immediately. All three mobile modes,
   including Vibrate, require notification permission.
3. Tap **Simulate arrival in 5 seconds** to start a mock journey outside the
   selected radius. After five seconds, an accurate simulated position reaches
   the demo stop and the same alert delivery code runs. Keep the screen open.
4. Tap **Cancel test** to stop the countdown. Leaving this screen or putting
   the app in the background cancels pending simulated arrivals. Tests cannot
   run alongside an enabled real trip alarm.

No GPS permission, route search, Python service or database write is involved.
The demo position is clearly marked as simulation and is never published as
real transit data. The regular GPS alarm still requires a valid recorded stop.

| Output | Installed native app | Website |
| --- | --- | --- |
| Vibrate | Direct device vibration while testing in the foreground | Requires browser Vibration API and physical vibration hardware; unavailable in iPhone Safari |
| Sound | Default system notification sound; allow notifications and turn up alert volume | Short audible tone after tapping a test button; keep the page open and turn up media volume |
| Notify | Local OS notification, visible in the notification center | Service-worker notification in supported HTTPS browsers; permission required |

Notify here tests a **local system notification**, not a message sent by a
remote push server. Stop proximity is detected on the phone, so remote push,
Firebase and OneSignal are not necessary for this alarm. Remote messaging
would be a separate feature with its own push credentials and device tokens.

On a local HTTP Wi-Fi preview, Safari sound can be tested, but native vibration
and system notifications cannot be promised. Unsupported modes show an
explanation and disable delivery rather than silently reporting success.
Android browser notifications use `ServiceWorkerRegistration.showNotification`
instead of the mobile-incompatible Notification constructor. The notification
worker does not cache the site or intercept API requests.

Use `npm run build:preview:android` for a new APK or
`npm run build:preview:ios` for a signed iPhone build. Physical iPhone EAS
builds still require Apple Developer team signing access. An OS delivery request
does not prove the device made a sound or vibrated: silent/Focus settings,
browser policies and device notification settings can suppress them. Check all
three outputs on the intended physical phone.

## Published route alarms

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
and Notify requests a silent notification. For a background iOS Vibrate alert,
the native build bundles `assets/sounds/transit_vibrate.wav` (one second of
silent PCM audio). The notification references that sound so iOS can apply its
notification haptics without an audible tone. Foreground tests use direct
vibration. iOS does not expose an independent background vibration pattern;
enable notification Sounds and device haptics, including haptics in silent mode
if needed. The OS controls the resulting haptic behavior. A new iOS build is
required to install the resource; Fast Refresh and Expo Go cannot add it.
iOS vibration, volume, Do Not Disturb and notification channel overrides remain
device-controlled. Delivery errors
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

## Notification permission and locked-screen checks

When mobile notification permission is missing or declined, both the test panel
and Stop Alarm dim and block Vibrate, Sound and Notify. A transparent button
over the dark mask says **Turn on push notifications in Multraverse to use this
feature.** Tap it to request permission, or open app settings after a permanent
denial. The screen rechecks permission when focused and when returning from
Settings, so granting it unlocks the modes without restarting. Revocation also
blocks test delivery and background arrival delivery; an active alarm is stopped
when the page observes the denial. Website permission behavior is unchanged.

On a freshly installed physical-device build:

1. Decline notifications. Check that neither alarm panel accepts mode changes
   or test/start actions, including with a screen reader.
2. Tap the overlay, enable Multraverse notifications in Settings, and return.
   Check that all modes unlock immediately. Disable permission again and verify
   that returning restores the overlay.
3. Grant Always/all-the-time location and precise GPS. Arm a real stop outside
   the selected radius, then lock the screen before approaching it. Repeat for
   Vibrate, Sound and Notify. Check one notification per arrival and that GPS
   tracking stops afterward. Test Sounds/haptics and lock-screen visibility in
   the phone's notification settings; Focus and battery restrictions still apply.

Screen-off operation requires a powered-on phone and an enabled native trip.
A fully powered-off phone cannot track GPS or deliver an alarm. Foreground
simulations still cancel on screen lock; use a real armed trip for this check.
The automated suite verifies OS notification requests and background task
behavior with mocked APIs; it cannot verify physical haptics or speaker output.
