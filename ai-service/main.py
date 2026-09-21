"""Local FastAPI service for the Pangasinan TinyLlama LoRA adapter."""

import json
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
for cache_variable in ("HF_HOME", "TRANSFORMERS_CACHE", "HF_DATASETS_CACHE"):
    cache_path = os.getenv(cache_variable)
    if cache_path and not Path(cache_path).is_absolute():
        os.environ[cache_variable] = str((ROOT / cache_path).resolve())

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from peft import PeftModel
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer


BASE_MODEL = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
model_parent = Path(os.getenv("MODEL_DIR", str(ROOT / "model")))
if not model_parent.is_absolute():
    model_parent = ROOT / model_parent
MODEL_DIR = model_parent / "pangasinan-travel-model"

app = FastAPI(title="Multraverse AI Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ItineraryRequest(BaseModel):
    destination: str = Field(min_length=1, max_length=200)
    budget: str = Field(min_length=1, max_length=100)
    days: int = Field(ge=1, le=30)
    preferences: list[str] = Field(default_factory=list, max_length=20)


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4_000)
    from_lang: str = Field(min_length=1, max_length=80)
    to_lang: str = Field(min_length=1, max_length=80)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=8_000)
    max_tokens: int = Field(default=512, ge=1, le=1_024)


class ModelUnavailableError(RuntimeError):
    """Raised when the trained adapter has not been produced yet."""


@lru_cache(maxsize=1)
def load_model():
    """Load and cache the base model and its trained LoRA adapter on CPU."""
    if not (MODEL_DIR / "adapter_config.json").is_file():
        raise ModelUnavailableError(
            f"No trained LoRA adapter found at {MODEL_DIR}. Run train.py first."
        )

    print("Loading model...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
    tokenizer.pad_token = tokenizer.pad_token or tokenizer.eos_token
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float32,
    )
    model = PeftModel.from_pretrained(base_model, MODEL_DIR)
    model.config.pad_token_id = tokenizer.pad_token_id
    model.eval()
    print("Model loaded successfully!")
    return tokenizer, model


def generate_response(prompt: str, max_new_tokens: int = 512) -> str:
    tokenizer, model = load_model()
    formatted = f"<|user|>\n{prompt}\n<|assistant|>\n"
    inputs = tokenizer(formatted, return_tensors="pt")
    with torch.inference_mode():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            do_sample=True,
            top_p=0.9,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )
    generated = outputs[0][inputs["input_ids"].shape[1] :]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()


def generation_error(error: Exception) -> HTTPException:
    if isinstance(error, ModelUnavailableError):
        return HTTPException(status_code=503, detail=str(error))
    return HTTPException(status_code=500, detail="Model generation failed")


@app.get("/health")
def health():
    return {
        "status": "ok" if (MODEL_DIR / "adapter_config.json").is_file() else "model_unavailable",
        "model": "pangasinan-travel-model",
    }


@app.post("/itinerary")
def generate_itinerary(request: ItineraryRequest):
    prompt = f"""Create a detailed {request.days}-day travel itinerary for {request.destination}, Pangasinan with a total budget of ₱{request.budget}.
Travel preferences: {', '.join(request.preferences) if request.preferences else 'general sightseeing'}.
Use real Pangasinan jeepney and bus routes with accurate prices.
Include local food recommendations.
Respond ONLY with a valid JSON object using this structure:
{{"days": [{{"day": 1, "stops": [{{"time": "8:00 AM", "place": "Place Name", "activity": "Activity description", "estimatedCost": 150}}]}}]}}"""
    try:
        response = generate_response(prompt, max_new_tokens=1024)
        clean = response.replace("```json", "").replace("```", "").strip()
        start, end = clean.find("{"), clean.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(clean[start:end])
        return {"raw": response}
    except Exception as error:
        raise generation_error(error) from error


@app.post("/translate")
def translate(request: TranslateRequest):
    prompt = (
        f"Translate the following from {request.from_lang} to {request.to_lang}. "
        f"Return only the translated text, nothing else:\n{request.text}"
    )
    try:
        return {"translation": generate_response(prompt, max_new_tokens=200), "source": "custom-model"}
    except Exception as error:
        raise generation_error(error) from error


@app.post("/generate")
def generate(request: GenerateRequest):
    try:
        return {"response": generate_response(request.prompt, request.max_tokens)}
    except Exception as error:
        raise generation_error(error) from error


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
