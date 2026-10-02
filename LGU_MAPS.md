# LGU dashboard maps

The dashboard uses the signed-in account's municipality. All 48 Pangasinan
LGUs use the same interactive component with their own bundled boundary.
Street tiles are clipped to that boundary; adjacent LGUs are hidden. Missing
account scope continues to show the existing unassigned-municipality message.

Drag to pan, use Zoom in / Zoom out, or Reset view to fit the whole LGU.
Use GPS requests foreground location permission only when pressed. An in-area
location gets a blue marker; an outside location does not change the LGU scope.
GPS precision depends on the device, and location checks use the bundled 2023
boundary data (see PANGASINAN_MAP_SOURCES.md).

Maps use OpenStreetMap tiles without an API key or paid subscription. Street
tiles require internet; the bundled outline remains available without tiles.
Keep attribution visible, respect HTTP caching, and do not bulk-download tiles.
The community tile service has limited capacity and no availability guarantee:
https://operations.osmfoundation.org/policies/tiles/
An alternative compatible provider can be configured with
`EXPO_PUBLIC_MAP_TILE_URL` containing `{z}`, `{x}`, and `{y}` placeholders.

Web GPS requires HTTPS or localhost and browser location permission. Physical
Android devices using a plain HTTP LAN URL should use the native app or HTTPS.
Rebuild installed Android/iOS apps after adding `expo-location`; restarting
Metro alone does not add a native module to an existing APK.

Checks:

```sh
node scripts/check-lgu-municipalities.cjs
node scripts/check-lgu-map.cjs
npm run build:web
```

Verify GPS on a physical device: allow permission, deny permission, disable
location services, and test a position inside/outside the assigned LGU.
