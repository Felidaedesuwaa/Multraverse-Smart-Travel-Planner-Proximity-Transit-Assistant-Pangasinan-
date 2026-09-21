# Multraverse local AI service

This service provides the project's custom local AI model. Express forwards AI
requests to its FastAPI endpoints through `AI_SERVICE_URL`; no hosted AI provider
API key is required. It loads verified phrases, places, fares, and local foods
from MongoDB Atlas at startup. It also supports local Whisper transcription and
offline WAV text-to-speech when their optional dependencies are installed.

## Windows setup

Python 3.11 or 3.12 (64-bit) can use these dependency versions. This workspace was
set up with its existing Python 3.12.4 installation. The requirements preserve the
requested versions except PyTorch: 2.4.1 fixes the Windows `fbgemm.dll` import failure
encountered with 2.4.0. NumPy is pinned to 1.26.4 for PyTorch 2.4 compatibility.
`requirements-lock.txt` records all installed package versions for this Windows
Python 3.12 environment; install from it to reproduce the tested dependency set.

Run from the project root in PowerShell:

```powershell
cd ai-service
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r requirements.txt
# On a fresh checkout only; do not overwrite an existing configuration:
Copy-Item .env.example .env
.\venv\Scripts\python.exe prepare_data.py
.\venv\Scripts\python.exe -m pip check
```

Set `MONGODB_URI` in `ai-service/.env` to the same valid Atlas connection used
by `server/.env`. The FastAPI startup log reports the number of cached phrases,
places, routes, and foods; restart the service after changing data in Compass.

Directly invoking the virtual environment's interpreter avoids PowerShell activation
policy problems. `.env`, virtual environments, caches, and model weights are ignored
by Git. `.env` contains paths only and needs no Groq key.
Run future Python entry points from `ai-service` and load `.env` before importing
Transformers so Hugging Face caches remain inside the project.

## Dataset

- `data/examples.jsonl`: the 12 supplied examples, preserved as source material.
- `data/pangasinan_itinerary.jsonl`: 98 records, each with `instruction` and `response`.
- `data/provenance.json`: source, group, and review status for each output line.
- `prepare_data.py`: combines the examples with English ↔ Pangasinan translations
  from all 43 entries in `server/seeds/seedPhrasebook.ts`; validates fields and rejects
  duplicate instructions. Rebuilding replaces the generated dataset and provenance.
  Make edits in the source examples or phrasebook before rebuilding.

These are unreviewed starter examples, not independently verified training labels.
Have a fluent Pangasinan speaker review translations. Confirm travel fares, schedules,
fees, accessibility, and food claims with local sources before training for real users.
The two-day Bolinao example's listed costs add up to ₱1,790, but its supplied total is
₱1,690; it also omits some transport costs. It is preserved for review rather than
silently treated as a correct label. The Hundred Islands example's timing conflicts
with the seed route's two-hour Dagupan–Alaminos duration.

This dataset is mostly translations, not 98 independent itinerary examples. Expand
with reviewed itineraries and different budgets/durations before expecting useful
itinerary generation. More rows alone do not establish model quality.

## Training and model integration

1. Choose a small pretrained model and check its license, language performance,
   hardware requirements, and compatibility with these pinned libraries. Fine-tuning
   produces your custom derivative/adapter, not a model trained from scratch.
2. Review and correct the examples. Keep equivalent phrases and reverse translations
   together when making train/validation/test splits. The supplied examples overlap
   with phrasebook entries too, so merge semantic groups before splitting; randomly
   splitting lines would overestimate performance.
3. Match training examples to the serving prompt and output format. The current
   Express itinerary endpoint requires JSON `{days: [{day, stops: [{time, place,
activity, estimatedCost}]}]}`, whereas these supplied examples use prose.
4. Keep changing travel facts in the existing database and provide them as model
   context. Train on how to use those facts rather than relying on memorized prices.
5. Train and evaluate on held-out reviewed examples before relying on generated
   itineraries in production. Express already forwards text-model requests to this
   FastAPI service through `AI_SERVICE_URL`.

## Phase 3: LoRA fine-tuning

`train.py` fine-tunes a LoRA adapter for
`TinyLlama/TinyLlama-1.1B-Chat-v1.0` on CPU and writes it to
`model/pangasinan-travel-model`. It uses float32, a batch size of two, gradient
accumulation, and three epochs. On a CPU this can take 30–60 minutes (or longer,
depending on the machine); a compatible GPU is substantially faster.

The script refuses to train while `data/provenance.json` contains records other
than `reviewed`. After correcting and reviewing the source material, update those
statuses and run:

```powershell
cd ai-service
.\venv\Scripts\python.exe train.py
```

For an explicitly experimental run on the current unreviewed starter dataset:

```powershell
.\venv\Scripts\python.exe train.py --allow-unreviewed
```

The first training run downloads the TinyLlama base model into the project cache.
The output is a LoRA adapter plus tokenizer, which the FastAPI service loads with
the same TinyLlama base model.

## Phase 4: FastAPI service

`main.py` provides `/health`, `/itinerary`, `/translate`, `/transcribe`, `/speech`, and `/generate` on port 8000. It starts before an adapter exists; `/health` reports `model_unavailable` and
generation endpoints return HTTP 503 until Phase 3 produces
`model/pangasinan-travel-model/adapter_config.json`.

```powershell
cd ai-service
.\venv\Scripts\python.exe main.py
```

Once an adapter exists, the first generation request loads TinyLlama and the LoRA
adapter into CPU memory. Keep this service running alongside Express; the Express
AI routes proxy `/itinerary` and `/translate` requests to it.
