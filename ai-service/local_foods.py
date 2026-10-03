"""Shared PDF food knowledge with destination-scoped database retrieval."""
import json
import re
from pathlib import Path
from knowledge import normalize

REFERENCE = json.loads((Path(__file__).resolve().parent.parent / 'server/src/data/localFoodReference.json').read_text(encoding='utf-8'))


def source_foods(destination):
    needle = normalize(destination)
    return [dict(food, source_file=REFERENCE['source_file'], note=REFERENCE['note'])
            for food in REFERENCE['foods']
            if any(normalize(locality) == needle or (needle and normalize(locality) != 'pangasinan'
                   and re.search(r'\b' + re.escape(normalize(locality)) + r'\b', needle)) for locality in food['localities'])]


def get_foods(destination, database=None):
    retained = source_foods(destination)
    if database is None:
        return retained
    try:
        # Fetch approved records live so moderation and corrections apply immediately.
        rows = list(database.localfoods.find({'approvalStatus': 'approved', 'pendingDeletion': {'$ne': True}},
                    {'_id': 0, 'name': 1, 'description': 1, 'category': 1, 'municipality': 1, 'where': 1, 'avgPrice': 1}))
        needle = normalize(destination)
        matching = [row for row in rows if normalize(row.get('municipality', '')) == needle]
        # A successful database read is authoritative, including an empty published list.
        return matching
    except Exception:
        return retained
