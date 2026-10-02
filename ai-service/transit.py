"""Grounded transit selection: never invent operators, stops, fares or schedules."""
from pydantic import BaseModel, Field
from fastapi import APIRouter

router = APIRouter()

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
