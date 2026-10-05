# Preview and test on Android and iOS

## Mobile startup and sign-in

Each fresh launch of the native Android or iOS app opens the user login screen,
including when a previous account was saved. Sign in to open your account's
workspace. Signing out returns to login. Briefly switching apps or returning
from a permission prompt keeps the current session and transit alerts active.
The website keeps its existing landing page and saved-session behavior.

To verify on a phone, sign in, fully close the app, then reopen it and confirm
login appears before any account screens. Sign in again, switch apps, and
return to confirm your current screen remains open. Saved trips and preferences
should remain available after signing back in. Run `npm.cmd run test:startup`
for automated startup, account-role, navigation, and resume checks.

## iOS status-bar appearance error

If iOS reports that `UIViewControllerBasedStatusBarAppearance` must be `YES`,
fully close the preview client from the iPhone app switcher, then reopen the
same Expo project. Fast Refresh can update an existing native screen's old
status-bar properties while removing them, which still triggers the native
assertion. A JavaScript refresh alone may leave the error visible.

The app controls the status bar through React Native's app-wide `StatusBar`.
`app.json` explicitly sets `UIViewControllerBasedStatusBarAppearance` to `false`
for generated iOS builds, matching Expo's default and this app-wide control.
Native-stack `statusBarStyle` and `statusBarHidden` options must remain unset:
they invoke the controller-based APIs that produced this error. The header's
safe-area padding remains in place for the camera, clock, and battery indicator.
Setting the key to `true` while keeping React Native's app-wide `StatusBar`
would cause the opposite configuration error in `RCTStatusBarManager`.

An Expo Go or development client loading JavaScript from the local preview
can use the fix without a new native build. An installed app using an embedded
older JavaScript bundle needs an updated build installed on the phone; editing
`app.json` or restarting Metro cannot replace that installed bundle. Run
`npm.cmd run test:startup` to check the status-bar settings together with startup
navigation and safe-area spacing.

## Itinerary planner and PDF export

Generate a plan from the third review step while scrolled to the bottom. The
results should open at the top with the keyboard dismissed. Check the option
and action icons, explore every day's schedule and plan notes, and confirm
Save plan appears after the notes. Edit and regenerate to verify this again.

Tap Download PDF to create a PDF containing the schedule, local foods, costs,
transport fares, and plan notes. On iPhone, choose Save to Files in the system
share sheet. On Android, choose a file-storage app in the save/share dialog.
Open the saved file in a PDF viewer and check a multi-day plan as well.
Export works locally after generation; it does not need another API request.
Canceling the dialog should leave the itinerary available to export again.

This feature uses SDK-compatible `expo-file-system` and `expo-sharing`.
Expo Go includes these modules. An existing custom development/preview build
that does not contain `expo-sharing` needs to be rebuilt before testing PDF
export. The planner remains usable in an older preview client if PDF export
is unavailable. Run `npm.cmd run test:itinerary` for rendering, icon, scroll,
save-position, PDF structure/content, and export error checks.

## Shared Expo preview

From the repository root, run:

```powershell
npm.cmd run preview
```

Connect both phones and the computer to the same Wi-Fi. The command starts one
Expo server that serves Android, iOS, and web bundles, with a shared local API
connection. Choose the preview appropriate to your device:

| Device / mode | How to open it | Requirements |
| --- | --- | --- |
| Android, Expo Go | Scan the terminal QR code in Expo Go or enter the printed `exp://` link | Expo Go compatible with SDK 57 |
| Android, browser | Open the printed `http://` link in Chrome | No Apple account or native build |
| iPhone, browser | Open the same `http://` link in Safari | No Apple account or native build |
| iPhone, Expo Go | Open the Expo link with a compatible installed client | Current iPhone Expo Go setup requires Apple membership and matching Expo logins |
| Android emulator | Run `npm.cmd run preview:android` | Android Studio/SDK and a running emulator |
| iOS Simulator | Run `npm run preview:ios` | Mac with Xcode and iOS Simulator |

Use `npm.cmd run preview:web` for browser-focused instructions. `android:web`
and `ios:web` remain aliases for the same shared browser preview. A browser
uses the HTTP address; the Expo QR code opens the native Expo Go client.
Keep the terminal open.
Press Ctrl+C to stop the preview.

If native manifest requests fail with an Expo account/server error, use
`npm.cmd run preview -- --offline` for Android Expo Go and browser previews
on both phones. This skips Expo's remote account requests while keeping the
local app/API connection. It does not take your database or app API offline.
For physical iPhone Expo Go, use online mode and sign in with the same Expo
account in the CLI (`npx expo login`) and iPhone client.

Keep a reused backend's terminal open as well. If startup reports that MongoDB
is unreachable, fix the database connection in `server/.env` before using the
automatic backend startup. The preview can reuse a running healthy backend
even when its current environment file is not ready for a restart.

The command starts Expo on port 8082 and exposes its API on port 3002, selecting
the next available port if a default is occupied. If
your API is already healthy on its configured port (normally 3001), the command
reuses it through a local proxy that permits the preview's browser origins.
Otherwise, it starts a separate API using your existing `server/.env` for
MongoDB and authentication. The frontend points at the computer's Wi-Fi address.
These settings apply only to this preview; environment files and production
CORS settings are not changed. Existing services on 3001/8081 can continue
running. Stopping the preview leaves a reused API running.

Dependencies must already be installed in the root and `server/`, with valid
`MONGODB_URI` and `JWT_SECRET` in `server/.env` (see the README installation
instructions). Backend changes require restarting this command.

If your computer has several network adapters, select its Wi-Fi IP explicitly:

```powershell
npm.cmd run preview -- --host 192.168.100.26
```

Use your computer's current address; it may change. To select different ports:

```powershell
npm.cmd run preview -- --port 8083 --api-port 3003
```

`npm.cmd run preview -- --check` validates dependencies, network selection,
required configuration, and free ports without starting services. It does not
test the database connection; startup checks API health before launching Expo.

If either phone cannot connect, check that both devices use the same Wi-Fi, disable
a VPN that blocks local networking, and allow Node.js on your private network
if Windows Firewall prompts. Guest Wi-Fi can block access between devices.

This local HTTP preview supports app screens and API features such as sign-in,
trip planning, and saved data. Browser GPS and microphone access require HTTPS;
use the deployed HTTPS website for those browser features (see
[secure browser features](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts)). See DEPLOYMENT.md
for website hosting. Background transit alarms require a native app and cannot
be verified in a browser, including a website added to the Home Screen. Expo Go
also cannot test this app's background transit alarms; use an installed native
preview build for those checks. See [transit testing](TRANSIT_ALARM.md).

## Installable native previews for both platforms

The shared EAS `preview` profile uses internal distribution and the Preview
environment. `android-device` and `ios-device` inherit it, including
`EXPO_PUBLIC_API_URL=https://multraverse-backend.vercel.app`. If your deployed
API changes, update that shared value before building either app. Confirm its
`/api/health` endpoint is reachable from the phone. Local `npm run preview`
uses the computer's local API instead of this cloud-build URL.

Build Android separately so an Apple account problem does not block it:

```powershell
npm.cmd run build:preview:android
```

Open the resulting EAS installation link on an Android phone and install the
APK. No Apple account is needed. This APK contains the JavaScript bundle and
native modules; it does not need the Expo development server. Backend access
is still required for online features. Rebuild after changing native modules
or permissions. This is also the Android emulator's installable preview format.

For an iPhone native preview, register the device with `npx eas-cli@latest
device:create` once Apple signing access is available, then run:

```powershell
npm.cmd run build:preview:ios
```

The separate `ios-simulator` profile creates a simulator app without physical
device signing. Both phone builds use their respective Android/iOS native code
and permissions. Test background location, local notifications, and transit
alerts on actual devices; exporting bundles does not verify OS behavior.

## Why the Apple team error occurs

`You have no team associated with your Apple account` occurs after successful
Apple authentication when EAS cannot find an eligible developer team for
signing an iPhone build. A free Apple account does not provide the paid signing
team needed for EAS physical-device builds. Changing the bundle identifier,
retrying two-factor authentication, or using simulator signing cannot fix this
for a physical iPhone.

The current [Expo Go iPhone setup](https://github.com/expo/expo/blob/main/docs/scenes/get-started/set-up-your-environment/instructions/iosPhysicalExpoGo.mdx)
also requires an Apple Developer Program membership. It is not a free workaround
for this SDK 57 project on an iPhone.

If you later need the native iPhone app, enroll in the
[Apple Developer Program](https://developer.apple.com/programs/enroll/), or join
an existing enrolled organization with signing access. Verify that the same
Apple account shows an active membership and team before retrying EAS. See
[Expo's device-build guide](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/).

With access to a Mac, [Xcode Personal Team signing](https://developer.apple.com/help/account/basics/about-your-developer-account)
can test an app on your personal iPhone with a free Apple account, subject to
Apple's capability limits and periodic reprovisioning. Windows cannot run Xcode
or the iOS simulator.

## Native iPhone build from Windows

The `ios-device` EAS profile inherits the shared internal preview settings.
The public API URL is included in that shared profile, so no local `.env`
upload or server credentials are needed for the frontend.

1. Sign in at [Apple Developer](https://developer.apple.com/account/) with the
   Apple account you intend to use for signing. Check that an active Developer
   Program membership and team are available. If none is available, enroll at
   [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)
   or ask your organization's Apple developer team administrator to grant the
   signing access described in
   [Expo's Apple team permissions guide](https://docs.expo.dev/app-signing/apple-developer-program-roles-and-permissions/).
   An Expo organization invitation alone does not grant Apple signing access.
2. After membership/team access is active, register your testing iPhone:

   ```cmd
   npx eas-cli@latest device:create
   ```

   Open the registration link on that iPhone and follow its instructions.
3. Build from the repository root:

   ```cmd
   npx eas-cli@latest build --platform ios --profile ios-device
   ```

   Use the Apple account with team access, select the appropriate team and
   registered device, and let EAS configure signing credentials. If your team
   has already supplied valid credentials, its authorized member can manage
   them without sharing an Apple password.
4. Once the build succeeds, open its installation link on the registered
   iPhone. Test background location and transit alerts on the actual device;
   successful compilation alone does not verify notification delivery.

## Dropdowns and notification permissions

Planner dropdowns use a compact panel with a separate modal safe-area provider.
Open the Bus fare matrix and destination dropdown immediately after a cold
launch. The title, Close icon, search field and options should be visible on
the first opening, clear of the camera, clock, battery and home indicator.
Verify selection, scrolling through long lists, search, keyboard dismissal,
Close, tapping outside the panel and Android Back. Reopening should show the
same layout and selected item.

Transit Alarm masks all three methods when mobile notifications are declined.
Tap the overlay to grant permission or open Multraverse settings; returning
should unlock the modes without closing the app. Test both alarm panels.
The new iOS background vibration sound resource requires a fresh installed
build. Expo Go and Fast Refresh cannot install native notification sounds.
Use a real armed trip to check each mode with the phone locked; the phone must
remain powered on. See [the transit verification checklist](TRANSIT_ALARM.md#notification-permission-and-locked-screen-checks).

## iOS Simulator build (Mac required to run it locally)

The separate `ios-simulator` profile avoids Apple device signing:

```cmd
npx eas-cli@latest build --platform ios --profile ios-simulator
```

You can request this cloud build from Windows, but the result is a simulator
app, not an installable iPhone IPA. Run it with Xcode's iOS Simulator on a Mac:

```sh
npx eas-cli@latest build:run --platform ios --latest
```

No Apple Developer Program membership is needed for this simulator build.
It does not replace physical-device testing of background GPS and alerts.
See [Expo's simulator build guide](https://docs.expo.dev/build-reference/simulators/).
