# Multraverse AI service

Knowledge comes from Phrasebook V2 (95 entries) and seven uploaded guides:
Dagupan, Alaminos, Urdaneta, San Carlos, Lingayen, Manaoag and Bolinao.
`db.py` reads `phrasebooks` and published `localfoods` from MongoDB, with a local fallback.
Tourism retrieval uses `server/src/data/cityGuides.json`; unsupported areas have
no provincial fallback. The retired provincial collection is not read or recreated.

From `ai-service/`:

```powershell
.\venv\Scripts\python.exe prepare_data.py
.\venv\Scripts\python.exe -m unittest test_knowledge test_narrative test_city_guides
.\venv\Scripts\python.exe main.py
```

The supplied `Pangasinan_Local_Foods_Database_Reference.pdf` adds 53 foods in
`server/src/data/localFoodReference.json`, retaining locality associations, PDF
pages and the source SHA-256. Run `npm.cmd run seed:local-foods` from `server/`
to import locality-specific records (`-- --dry-run` validates without writing).
Existing IDs, prices, photos and moderation decisions are preserved.
The planner already retrieves approved database foods for its food shortlist and
AI ranking. FastAPI `/itinerary` also returns destination-scoped `local_foods`,
and food questions through `/generate` use this reference. Database retrieval is
live; offline retrieval uses the retained source. Province-wide and regional
associations do not imply confirmed availability in every town. Prices remain
unknown. `prepare_data.py` adds all 53 foods to the training corpus; preparing
knowledge does not retrain model weights. Restart the AI service to load code changes.

MongoDB uses `MONGODB_URI` from `server/.env` (or the process environment).
There is no separate AI database credential to keep synchronized. Restart the service
after changing sources. `prepare_data.py` rebuilds the corpus, per-row provenance,
V2 phrase export for Express and a SHA-256 knowledge manifest. It does not connect
to MongoDB or train weights. Include all retained source files when deploying.

From `server/`, the knowledge commands are:

```powershell
npm.cmd run seed:phrases
npm.cmd run seed:city-guides
```

All accept `-- --dry-run`. They preserve existing catalog data. V2 upserts its
95 entries; runtime source filters exclude legacy phrases without deleting other
application data. Account/database administration remains separate.

For an existing database containing the retired provincial import, run
`node scripts/remove-retired-tourism.cjs` from `server/` to inspect counts, then
add `--apply` to replace overlapping source content with selected guide content,
remove remaining retired catalog rows and drop `tourismknowledge`. The migration
uses exact importer IDs and source markers, and never recreates that collection.

`/generate` returns source records for a named LGU or listed attraction, including
verification flags and provenance. `/translate` uses exact V2 translations in all
six language directions; an unknown phrase returns 404. `/phrasebook/all` serves
V2. `/itinerary` returns up to four source-listed attractions per day, with unknown
times/costs set to null and no claim that a budget has been verified. This is a
suggestion list; the Express deterministic planner still handles actual trip plans.
These knowledge endpoints work without model weights. Speech endpoints are unchanged.

City-specific guides retain attractions, hotels, foods, dining, festivals and sample
itinerary suggestions with PDF provenance. The Dagupan PDF does not state a date,
so its source date is null. Missing operating hours, fares and prices remain unknown.
See `../server/data/CITY-GUIDES.md` for extraction, precedence and future city imports.
The Alaminos PDF is dated September 2026 (month precision). Its published boat
and activity rates are explicitly reference-only and never treated as verified
current costs. Training includes only the selected guides and Phrasebook V2.

Optional TinyLlama generation is used for the planner's extractive `/narrative`
endpoint. Existing weights without a matching knowledge manifest are considered
stale. `/health` reports knowledge source and adapter status separately.

To train new weights, review `data/provenance.json`, mark reviewed entries, then run
`train.py` (or explicitly use `--allow-unreviewed` for an experimental run).
Training uses only `data/combined_training_data.jsonl`, refuses stale provenance
and splits oversized responses into bounded training examples while retaining all
source text. Prompts that leave no room for a response still fail. Successful
training saves the knowledge manifest beside the adapter. Preparing data does not
claim that TinyLlama has been retrained. Keep equivalent translations and records
from the same LGU together when building evaluation splits.

### Itinerary ranking rules

`/itinerary/rank` receives total budget, remaining visit allowance, daily meal
allowance, group size, days and listed admission costs. Its prompt prioritizes
selected categories and affordable visits without treating unknown prices as
free. Food Trip / Local Food includes the full destination food list; the Express
planner enforces this independently of model output and uses recent history only
to prefer variety. These are runtime selection and prompt changes; model weights
do not need retraining. Restart the AI service after updating `main.py`.

The itinerary fare reference is imported from `Pangasinan_Fare_Reference_Updated_Tricycle.pdf` (13 pages). `fares.py` reads the shared JSON at runtime; no model retraining is needed. The planner uses exact regular-fare rows for traditional jeepneys, ordinary/aircon buses (effective 2026-09-28), and Dagupan shared tricycles. Discount columns are shown separately; trip totals assume regular passengers. Special tricycle hire and night surcharges need separate confirmation. Other LGUs have no listed tricycle prices in this reference.
