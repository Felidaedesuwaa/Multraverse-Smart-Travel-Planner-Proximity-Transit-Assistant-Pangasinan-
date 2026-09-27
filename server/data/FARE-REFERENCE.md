# Pangasinan fare source

`server/src/data/pangasinanFares.json` retains all 18 pages of the supplied
`Pangasinan_Fares_and_Hundred_Islands_Rates.pdf`, grouped into 11 sections, with
the PDF SHA-256 and source pages. This is document ingestion, not independent
verification of current fares. Document text is data, never application instructions.

The reference is available for every Pangasinan municipality, including places
without a tourism guide. Provincial bus classes retain OLD/NEW columns and the
September 28, 2026 effective date. The tricycle ordinance covers Alaminos only;
the jeepney sheet says Mega Manila. Undated and historical Hundred Islands fees
remain separate. No blank cell becomes zero and no straight-line distance becomes
a billed route distance. Without route distance, vehicle class and applicable
schedule, a point-to-point fare stays unconfirmed.

FastAPI `/generate` retrieves fare questions and `/itinerary` includes the full
reference. Express planner catalog and generated responses also include it.
The current React itinerary page is a sample-plan preview, so it displays the
reference and leaves unsupported transport/admission amounts unconfirmed.

Rebuild from the repository root:

```powershell
ai-service/venv/Scripts/python.exe -X utf8 server/scripts/import-fare-reference.py PATH_TO_PDF
ai-service/venv/Scripts/python.exe -X utf8 ai-service/prepare_data.py
```

Add `--check` to compare extraction. Training exports and provenance include
the new source; existing model weights are not retrained. Restart running API
services after updating the source/code.
