# City tourism guides

## Municipality guides: Bolinao, Manaoag and Lingayen

The same local registry holds the city and municipality guides;
these are compatibility names, not an assertion that these LGUs are cities.
Each new record explicitly has `lgu_type: Municipality`, `municipality_only: true`
and `city_only: false`. No new collection or duplicate seed pipeline is needed.

| Supplied PDF (7 pages each) | Attractions | Hotels | Food/product entries | Dining | Activities |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bolinao_Tourism_Guide.pdf | 9 | 7 | 5 | 6 | 12 |
| Manaoag_Tourism_Guide.pdf | 9 | 5 | 6 | 6 | 10 |
| Lingayen_Tourism_Guide.pdf | 12 | 6 | 6 | 5 | 9 |

All three say local listings were checked in September 2026. This is stored in
`listings_checked_month: 2026-09`; publication dates remain null. None prints
exact source URLs. `source_urls` is empty, named citations are in
`source_references`, and required `source_url` stores a `urn:sha256:` PDF identifier
rather than an invented website address. Full original page text and hashes are
retained for comparison. Business names, including `Apples&Pears; Hotel`, retain
the PDF spelling; only layout line breaks are joined.

Bolinao retains the combined Falls 1–3 attraction plus full individual waterfall
details and safety conditions. Reported swimming hours are unverified guidance,
not database opening hours. Sample itinerary times are illustrative, not verified
Mass times, opening hours or transit times. Manaoag farm tours and potential
agri-tourism sites require confirmation. Lingayen government/private heritage
access limits and the historical March 18–20, 2026 festival dates are preserved.

Run `ai-service/venv/Scripts/python.exe -X utf8 server/scripts/import-municipal-guides.py`
with one or more PDF paths (add `--check` for comparison), then rebuild with
`ai-service/prepare_data.py` using the same interpreter. From `server/`, run
`npm run seed:city-guides -- --dry-run` and `npm run seed:city-guides`.
These three guides supply their municipalities in retrieval, itinerary selection and training exports.

## San Carlos

`San_Carlos_City_Tourism_Guide.pdf` (5 pages) adds 9 attractions, 5 accommodations,
6 foods/products, 5 dining options, 9 activities, festival information and a
six-period sample itinerary. Its publication date is unknown (`source_date: null`).
Primary citation: https://www.sancarlospangasinan.gov.ph/tourism. The registry
retains all five explicit URLs, PDF SHA-256 and full extracted page text.

The Mango-Bamboo Festival's traditional April timing is not a confirmed future
event date. Mango availability is seasonal; farm visits and bamboo production
visits remain conditional on permission/arrangements. The PDF's Oltama entry is
retained as source-attributed San Carlos content, separately from Urdaneta's
Oltama entry; neither is independently location-verified or given coordinates.

From the repository root, run
`ai-service/venv/Scripts/python.exe -X utf8 server/scripts/import-san-carlos-guide.py PATH_TO_PDF`
(add `--check` for comparison), followed by `ai-service/prepare_data.py` with the
same Python interpreter. Run `npm run seed:city-guides` from `server/` to persist
all seven guides into the catalogs. Existing matching records are reused. No model weights are retrained by these commands.

`src/data/cityGuides.json` is the registry of city-specific source documents.
Entries supply itinerary attractions for the seven selected areas only.

## Alaminos

- File: `Alaminos_City_Tourism_Guide.pdf` supplied by the user (6 pages).
- Stated date: September 2026, stored as `2026-09`; no day is invented.
- 8 attractions, 12 accommodations, 4 local foods, 11 dining options, 10
  activities and a seven-period, two-day sample itinerary (including page 5).
- All five explicit official URLs, full extracted page text and the PDF SHA-256
  are retained. The PDF cites current local listings without individual URLs;
  these entries have not been independently verified against live listings.
- Three boat-rental rows and nine activity-rate rows are **historical reference
  rates**, not confirmed 2026 prices. Each carries `reference_only: true`,
  `current_rate_verified: false` and the rate warning. They are supplied as source
  context and training examples, never imported as verified transport fares or
  admission prices. The planner leaves unknown costs incomplete.

Extract from the repository root:

```powershell
ai-service/venv/Scripts/python.exe -X utf8 server/scripts/import-alaminos-guide.py PATH_TO_PDF
ai-service/venv/Scripts/python.exe -X utf8 ai-service/prepare_data.py
```

Use `--check` to validate exports against the PDF. The shared `seed:city-guides`
 command loads all registered cities and reuses documented existing names and
aliases. Training and retrieval use the selected guide.

## Dagupan

- File: `Dagupan_City_Tourism_Guide.pdf` supplied by the user (4 pages).
- No publication/snapshot date is stated; `source_date` is null.
- PDF citations: https://dagupan.gov.ph/tourism/ and
  https://dagupan.gov.ph/the-city/about-dagupan-city/. It also names DOT and local
  listings without giving exact URLs. These are attributions, not live checks.
- 9 main attractions, 6 hotels, 6 foods, 5 dining options, festival information,
  heritage notes and a five-period sample itinerary. Full extracted page text
  and the PDF SHA-256 are retained for auditing and future comparisons.
- The guide's city profile is preserved as written.

From the repository root:

```powershell
ai-service/venv/Scripts/python.exe -X utf8 server/scripts/import-dagupan-guide.py PATH_TO_PDF
ai-service/venv/Scripts/python.exe -X utf8 ai-service/prepare_data.py
```

Add `--check` to the extraction command to compare regenerated exports.
From `server/`, run `npm run seed:city-guides -- --dry-run`, then
`npm run seed:city-guides`. Full source documents stay in the local registry.
The seed projects selected guides into existing Place/LocalFood collections.
Overlapping retired entries receive guide content while retaining their IDs,
fees and moderation state. Other matching catalog records are preserved.

The planner overlays PDF descriptions on approved matching attractions, recognizes
documented aliases, excludes hotels/restaurants from attraction stops, and includes
the source filename/page in plan notes. Food guidance comes from the city's guide.
Unpriced items remain unknown. The PDF's morning/lunch/afternoon suggestions are
not opening hours or verified travel times. FastAPI exposes hotels, dining and the
sample itinerary as source context, not guaranteed availability or reservations.

Future city PDFs can append records with their own `area_id`, provenance and the
same data shape to the registry. Add a layout-specific extractor and corresponding
`ai-service/data/<area_id>_city_guide.jsonl`; the shared seed, retrieval and planner
already select guides by city. Do not create records for cities whose PDFs have
not been provided. Rebuild the training corpus after any source changes.

## Urdaneta

- File: `Urdaneta_City_Tourism_Guide.pdf` supplied by the user (5 pages).
- No publication date is stated; `source_date` is null. Dates on cited 2022
  news articles are preserved in page text, not used as a guide snapshot date.
- 11 attractions, 5 accommodations, 10 foods, 5 named dining options, 8 activities,
  festival guidance and a six-period sample itinerary. All page text, four explicit
  URLs and the PDF SHA-256 are retained. Primary citation:
  https://www.urdaneta-city.gov.ph/tourism.
- Farmland access requires public roads or permission. Cultural programs and
  evening markets are conditional on their schedules. No fees, opening hours,
  coordinates or current business verification are invented.
- Regenerate with `ai-service/venv/Scripts/python.exe -X utf8
  server/scripts/import-urdaneta-guide.py PATH_TO_PDF` from the repository root;
  add `--check` to compare without writing. Then run `ai-service/prepare_data.py`
  and the shared `seed:city-guides` command above.
- Urdaneta itinerary retrieval and training use this guide. Importing updates
  knowledge and training inputs, not trained model weights.
