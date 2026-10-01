# Selected tourism knowledge

`bolinao_city_guide.jsonl`, `manaoag_city_guide.jsonl` and
`lingayen_city_guide.jsonl` contain the supplied seven-page municipal tourism
guides. The filenames follow the shared LGU guide loader's naming convention;
the records explicitly identify these LGUs as municipalities. Local listings
were checked in **September 2026**, but the PDFs state no publication date and
print no exact source URLs. Named references, PDF SHA-256 identifiers and full
page text are preserved in `server/src/data/cityGuides.json`. No web URL was
invented. See `../../server/data/CITY-GUIDES.md` for extraction and update commands.
Their sample times and reported schedules are unverified planning context;
waterfall safety, farm arrangements and heritage access limits remain explicit.

City-specific additions are tracked in `server/src/data/cityGuides.json`.
`dagupan_city_guide.jsonl` is the attributed export of the four-page Dagupan City
Tourism Guide, which supplies Dagupan itinerary knowledge from the selected city guide. The PDF has no stated publication date. See
`../../server/data/CITY-GUIDES.md` for provenance and import instructions.

`alaminos_city_guide.jsonl` adds the six-page September 2026 Alaminos City guide.
Its three boat-rental records and nine activity rates retain explicit historical
reference warnings. They are not current verified fares. City guides take
precedence for their cities in retrieval, itinerary selection and training.

`urdaneta_city_guide.jsonl` adds the five-page Urdaneta City Tourism Guide,
attributed to https://www.urdaneta-city.gov.ph/tourism and the other PDF citations.
Its publication date is unknown; cited 2022 articles are not a snapshot date.
The export preserves farmland access restrictions and conditional event schedules.
Full page text and a PDF SHA-256 in the registry support future source comparisons.

`san-carlos_city_guide.jsonl` adds the five-page San Carlos City Tourism Guide.
Primary PDF citation: https://www.sancarlospangasinan.gov.ph/tourism.
No publication date is stated. Festival timing is traditional and subject to
annual announcements; mango products are seasonal and farm/industry visits may
require permission or arrangements. All five source URLs, full page text and
the PDF SHA-256 are retained in the registry. This completes the four city guides.

`prepare_data.py` rebuilds the combined corpus, provenance and knowledge manifest
from Phrasebook V2 and these seven guides only. No training occurs during preparation.
Full source documents remain in `server/src/data/cityGuides.json`; the guide seed
projects named entries into `places` and `localfoods` without a tourism source collection.
