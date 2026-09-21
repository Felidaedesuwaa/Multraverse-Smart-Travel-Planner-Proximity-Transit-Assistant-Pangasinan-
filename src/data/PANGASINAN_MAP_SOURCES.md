# Pangasinan dashboard map

The interactive vector outline follows the supplied Pangasinan silhouette using actual municipality boundaries rather than a raster with arbitrary hit boxes. All 48 cities and municipalities are included, including island polygons.

Boundary source: [Philippines JSON Maps, James Faeldon](https://github.com/faeldon/philippines-json-maps), 2023 high-resolution municipality GeoJSON for PSGC 105500000. The MIT license is retained in `PANGASINAN_MAP_LICENSE.txt`. Coordinates are projected with a local equirectangular projection at 16° N, fitted to a shared SVG coordinate system, and rounded to one decimal place. This is a destination overview, not a road-navigation map.

Photos: Wikimedia Commons. Every photo's source page, creator, and license are retained in `pangasinanPhotos.json` and displayed as a credit link in the carousel. Images are bundled unchanged in `src/assets/pangasinan`; the attribution metadata remains associated with each asset through `pangasinanPhotoAssets.js`. Individual licenses apply to the photographs independently of the application code.

Ratings: existing public Saved Places records matched to the area name or a known attraction alias. The displayed score averages valid nonzero ratings, deduplicated by record ID. These are app traveler ratings, not Google/Tripadvisor scores. Empty data and unavailable data have separate states.

To regenerate, from the repository root with internet access:

```sh
node scripts/build-pangasinan-map.cjs
node scripts/download-map-photos.cjs
node scripts/check-pangasinan-map.cjs
```

Source requests are cached under `.expo/map-source-cache`, which is ignored by Git. Review photo relevance and licensing before accepting a refreshed dataset. The app requires no runtime map API key.
