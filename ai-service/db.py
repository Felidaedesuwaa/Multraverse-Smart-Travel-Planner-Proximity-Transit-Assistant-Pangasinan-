"""Read-only MongoDB knowledge cache for the local AI service.

The Express API remains the owner of writes. This module loads verified content
at service startup so model requests do not repeatedly call Atlas.
"""

import os
import re
from threading import Lock
from typing import Any

from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.database import Database

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

_client: MongoClient | None = None
_database: Database | None = None
_cache: dict[str, list[dict[str, Any]]] = {"phrases": [], "places": [], "routes": [], "foods": []}
_lock = Lock()
_published_filter = {"pendingDeletion": {"$ne": True}, "$or": [{"approvalStatus": "approved"}, {"approvalStatus": {"$exists": False}}]}
_fields = {"Filipino": "filipino", "Pangasinan": "pangasinan", "English": "english"}


def get_db() -> Database:
    global _client, _database
    if _database is None:
        uri = os.getenv("MONGODB_URI")
        if not uri:
            raise RuntimeError("MONGODB_URI is required for the AI knowledge cache")
        try:
            _client = MongoClient(uri, serverSelectionTimeoutMS=8_000, connectTimeoutMS=8_000)
            _client.admin.command("ping")
            _database = _client.get_database("multraverse")
        except Exception:
            if _client is not None:
                _client.close()
            _client = None
            raise
        print("Connected to MongoDB Atlas knowledge cache")
    return _database


def load_knowledge() -> dict[str, int]:
    """Refresh every verified source once. Call this during FastAPI startup."""
    with _lock:
        database = get_db()
        _cache["phrases"] = list(database.phrasebooks.find({}, {"_id": 0}))
        _cache["places"] = list(database.places.find(_published_filter, {"_id": 0}))
        _cache["routes"] = list(database.routeprices.find(_published_filter, {"_id": 0}))
        _cache["foods"] = list(database.localfoods.find(_published_filter, {"_id": 0}))
        counts = {name: len(items) for name, items in _cache.items()}
        print(f"Loaded MongoDB AI knowledge: {counts}")
        return counts


def knowledge_counts() -> dict[str, int]:
    return {name: len(items) for name, items in _cache.items()}


def get_phrasebook(from_lang: str, to_lang: str, text: str) -> str | None:
    from_field, to_field = _fields.get(from_lang), _fields.get(to_lang)
    if not from_field or not to_field:
        return None
    needle = text.strip().casefold()
    for phrase in _cache["phrases"]:
        value = phrase.get(from_field)
        translated = phrase.get(to_field)
        if isinstance(value, str) and isinstance(translated, str) and value.strip().casefold() == needle:
            return translated
    return None


def get_places_by_destination(destination: str) -> list[dict[str, Any]]:
    needle = destination.casefold().strip()
    matches = [place for place in _cache["places"] if needle and any(needle in str(place.get(field, "")).casefold() for field in ("municipality", "location", "name", "areaId"))]
    # Hundred Islands is in Alaminos, so retain a useful contextual fallback.
    if not matches and "hundred island" in needle:
        matches = [place for place in _cache["places"] if "alaminos" in f"{place.get('municipality', '')} {place.get('location', '')}".casefold()]
    return matches or _cache["places"][:6]


def get_routes_by_destination(destination: str) -> list[dict[str, Any]]:
    needle = destination.casefold().strip()
    matches = [route for route in _cache["routes"] if needle and any(needle in str(route.get(field, "")).casefold() for field in ("from", "to"))]
    return matches or _cache["routes"][:8]


def get_local_foods() -> list[dict[str, Any]]:
    return _cache["foods"]


def get_all_phrases_by_category(category: str | None = None) -> list[dict[str, Any]]:
    return [phrase for phrase in _cache["phrases"] if not category or phrase.get("category") == category]


def close_db() -> None:
    global _client, _database
    if _client is not None:
        _client.close()
    _client = _database = None
