# Pangasinan transit route reference

Fare estimates use the user-specified `traditional_jeepney` policy in
`src/data/transitFarePolicy.json`: PHP14 for the first 4 km plus PHP2 per
additional km. Search results include `estimatedFare` and `fareCalculation`
for the published full-route distance, even when the selected journey is only
part of that route. UI labels explicitly identify the traditional-jeepney basis;
this planning assumption does not establish the actual modern-jeepney, van or
bus fare. Route 38's 52.8 km estimate is PHP111.60 per person.

`src/data/transitCorridorReferences.json` stores the separately user-supplied
2026 Lingayen–Labrador reference coordinates, with `gps_status: reference/mapped`
and `exact_stop_verified: false`. They are associated with matching corridor
labels in search results. The UI states “GPS reference available — exact stop
not publicly verified.” These coordinates have no supplied public GPS source
URL and are not attributed to the PDF or promoted to verified alarm stops.

The active source is the user-supplied `Pangasinan_Rationalized_Routes_44_with_GPS_Stops.pdf`,
archived as `pangasinan-rationalized-routes-44-gps.pdf`. The earlier PDF is retained
for provenance and its road alignments. `src/data/pangasinanTransitReference.json`
preserves all 44 routes, the new source SHA-256, named waypoint sequences, 43 numeric
WGS84 reference points, original vehicle classes, route lengths and authorized units.
Route 28 is now named San Manuel - Urdaneta City as specified in the new file.

The official route-plan source cited by both files is Provincial Ordinance No. 284-2022:
https://www.pangasinan.gov.ph/wp-content/uploads/2024/10/284-2022_opt.pdf
The GPS layer is supplied separately by the new document; the ordinance does not
verify those coordinates or current operations.

Transit Alarm searches these bundled routes alongside admin/LGU database records.
No database import is needed. Search follows the listed waypoint direction and can
match intermediate municipalities; no reverse services are inferred. Corridor labels,
Wedgewood and Tebag Villa without supplied coordinates are retained as unmapped
waypoints, never fabricated or offered as alarm targets. Route 6 has only one known
GPS waypoint and cannot match a two-municipality search.

Alarm targets retain `coordinateType`: `municipal_reference` or `mapped_locality`.
They are proximity targets, not verified passenger loading bays. The UI states this
and displays current operations and schedules as unconfirmed. Authorized units are
not operating vehicle or passenger counts. Every selectable point is checked against
the app's municipality boundaries; only matching coordinates are returned.

Validation: `npm run build --prefix server`, then
`node server/scripts/check-transit-search.cjs` and `node scripts/check-transit-alarm.cjs`.
