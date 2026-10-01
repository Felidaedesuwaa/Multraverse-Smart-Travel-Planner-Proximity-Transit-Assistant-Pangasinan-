The AI Itinerary page uses `GET /api/ai/itinerary/catalog` and `POST /api/ai/itinerary/grounded`. Both require the existing bearer authentication. User identity is derived from that token, never from the request body.

`src/data/itineraryCatalog.ts` projects the seven supported areas from `cityGuides.json`. These guides supersede the old frontend attraction, food and accommodation constants, including placeholder hotels and unsupported prices. The live database audit found empty place/food collections; this endpoint intentionally uses the source guide registry directly. No new LGUs are enabled. `sancarlos` is accepted as an alias for `san-carlos`.

The local FastAPI `/itinerary/rank` endpoint ranks only supplied entries. Express validates a complete permutation of catalog IDs and constructs all displayed text and cost fields itself. Preference matches take precedence; model order breaks ties. A disabled, unavailable or invalid model produces an explicitly labeled catalog fallback. Names, prices and model prose never pass through unchecked.

Current source rates are unconfirmed and the form supplies neither an origin nor billed route distance/vehicle class. All stop prices therefore remain null. Meal budget is an allocation, not a quoted price. Suggested time slots are not opening hours or measured transit times.

Generated snapshots are stored in `plannerdrafts.plan.guided`; Save uses the existing owner-scoped Trip endpoint and retains the full snapshot. The latest three distinct generated snapshots across drafts and Trips with the same area and normalized trip-type/activity sets supply exclusions. Legacy plans without those selections cannot be assigned a matching combination. Draft history expires after 365 days; saved Trips persist. Repeated lodging within the same multiday stay is intentional. Concurrent generation is rejected per user within one Express process.

Deployment: build the server, then run `node scripts/migrate-guided-itinerary.cjs` from `server` for a read-only validation check. Apply with `--apply --database=EXACT_DATABASE_NAME`. This adds only the optional snapshot property to the existing Trips and PlannerDraft validators, preserving other validation rules and documents. Restart Express and FastAPI after deployment.

Checks: `npm run build`, `node scripts/check-grounded-itinerary.cjs`, and the existing planner checks. From `ai-service`, run `venv/Scripts/python.exe -m unittest test_itinerary_rank test_narrative`; these use fake inference and do not download or load model weights.
