"""Grounded transit selection: never invent operators, stops, fares or schedules."""
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from functools import lru_cache
from pathlib import Path
import json
import math
import re
import time
from typing import Literal

router = APIRouter()

@lru_cache(maxsize=1)
def boundaries():
    # Use the same province data as the app and Express; no model guesses.
    source = Path(__file__).resolve().parents[1] / 'src/data/pangasinanMap.json'
    areas = json.loads(source.read_text(encoding='utf-8'))['areas']
    return [(area['id'], [list(zip(numbers[::2], numbers[1::2]))
            for part in area['d'].split('Z') if part.strip()
            for numbers in [[float(n) for n in re.findall(r'-?\d+(?:\.\d+)?', part)]]]) for area in areas]

def municipality(lat, lng):
    x = (lng * 0.9612616959383189 - 115.11081980143565) * 817.448349655742 + 40
    y = (16.443622150000063 - lat) * 817.448349655742 + 40
    for area_id, rings in boundaries():
        inside = False
        for ring in rings:
            for a, b in zip(ring, ring[-1:] + ring[:-1]):
                if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
                    inside = not inside
        if inside:
            return area_id
    return None

class TransitPoint(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)

class AlarmPlan(BaseModel):
    origin: TransitPoint
    destination: TransitPoint
    radius: Literal[100, 300, 500, 1000, 2000] = 500

class AlarmCheck(BaseModel):
    destination: TransitPoint
    position: TransitPoint
    accuracy: float = Field(ge=0, allow_inf_nan=False)
    timestamp: float = Field(ge=0, allow_inf_nan=False)  # Device milliseconds.
    radius: Literal[100, 300, 500, 1000, 2000] = 500

def distance_meters(a, b):
    lat1, lat2 = math.radians(a.lat), math.radians(b.lat)
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(math.radians(b.lng - a.lng) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(min(1, max(0, h))))

def verified_point(point, name):
    area_id = municipality(point.lat, point.lng)
    if not area_id:
        raise HTTPException(status_code=422, detail=f'{name} must be inside Pangasinan.')
    return {**point.model_dump(), 'areaId': area_id, 'name': name}

@router.post('/transit/alarm/plan')
def plan_alarm(request: AlarmPlan):
    origin = verified_point(request.origin, 'Current location')
    destination = verified_point(request.destination, 'Pinned destination')
    return {'origin': origin, 'destination': destination,
            'distanceKm': distance_meters(request.origin, request.destination) / 1000,
            'distanceType': 'straight-line', 'radius': request.radius,
            'policy': {'maxFixAgeMs': 30000, 'maxAccuracyMeters': min(100, request.radius / 2),
                       'includeAccuracyInRadius': True, 'oneShot': True, 'expiresAfterMs': 8 * 60 * 60 * 1000}}

@router.post('/transit/alarm/check')
def check_alarm(request: AlarmCheck):
    verified_point(request.destination, 'Destination')
    verified_point(request.position, 'GPS location')
    distance = distance_meters(request.position, request.destination)
    age = time.time() * 1000 - request.timestamp
    fresh = 0 <= age < 30000
    accurate = request.accuracy <= min(100, request.radius / 2)
    return {'distanceKm': distance / 1000, 'arrived': fresh and accurate and distance + request.accuracy <= request.radius,
            'fresh': fresh, 'accurate': accurate}

class TransitStop(BaseModel):
    name: str
    areaId: str
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)

class TransitCandidate(BaseModel):
    id: str
    stops: list[TransitStop] = Field(min_length=2, max_length=200)

class TransitSearch(BaseModel):
    from_area: str
    to_area: str
    candidates: list[TransitCandidate] = Field(max_length=500)

@router.post('/transit/search')
def search_transit(request: TransitSearch):
    # Express supplies only published, sourced Pangasinan routes. Preserve facts.
    matches = [r for r in request.candidates if r.stops[0].areaId == request.from_area
               and r.stops[-1].areaId == request.to_area]
    return {'route_ids': [r.id for r in sorted(matches, key=lambda r: len(r.stops))]}
