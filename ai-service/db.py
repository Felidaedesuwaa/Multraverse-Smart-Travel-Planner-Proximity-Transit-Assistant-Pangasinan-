"""Read retained V2 phrases and the seven selected local guides."""
import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv
from knowledge import (ROOT, source_phrases,
                       source_city_guides, matching_city_guides, public_guide)
import json
from fares import fare_reference, is_fare_query
from local_foods import get_foods

# Share Express's working connection instead of maintaining a second credential.
load_dotenv(ROOT.parent / 'server/.env')

_client = None
_cache = {'phrases': source_phrases()}
_status = 'local-sources'
_city_guides = source_city_guides()
_city_status = 'local-sources'


def load_knowledge():
    global _client, _cache, _status, _city_guides, _city_status
    if not os.getenv('MONGODB_URI'):
        return knowledge_counts()
    try:
        _client = MongoClient(os.environ['MONGODB_URI'], serverSelectionTimeoutMS=8000, connectTimeoutMS=8000)
        database = _client.get_default_database(default='multraverse')
        fields = ('filipino', 'pangasinan', 'english', 'category')
        allowed = {tuple(row[k] for k in fields) for row in source_phrases()}
        phrases = [{k: row[k] for k in fields} for row in database.phrasebooks.find({})
                   if tuple(row.get(k) for k in fields) in allowed]
        if {tuple(r[k] for k in fields) for r in phrases} != allowed:
            raise ValueError('MongoDB phrasebook is incomplete')
        _cache = {'phrases': phrases}
        _status = 'mongodb'
        _city_guides, _city_status = source_city_guides(), 'local-sources'
    except Exception:
        close_db()
        _cache = {'phrases': source_phrases()}
        _status = 'local-sources'
        _city_guides, _city_status = source_city_guides(), 'local-sources'
        print('Using retained local knowledge sources; Atlas cache unavailable or out of sync.')
    return knowledge_counts()


def knowledge_counts():
    return {'phrases': len(_cache['phrases']), 'lgus': len(_city_guides), 'shared_updates': 0, 'source': _status,
            'city_guides': len(_city_guides), 'city_guide_source': _city_status}


def get_phrasebook(from_lang, to_lang, text):
    if from_lang.casefold() not in ('english', 'filipino', 'pangasinan') or to_lang.casefold() not in ('english', 'filipino', 'pangasinan'):
        return None
    for phrase in _cache['phrases']:
        if phrase[from_lang.casefold()].strip().casefold() == text.strip().casefold():
            return phrase[to_lang.casefold()]
    return None


def get_places_by_destination(destination):
    guides = matching_city_guides(destination, _city_guides)
    guide_places = []
    for guide in guides:
        ordered = sorted(guide['attractions'], key=lambda a: guide['itinerary_attraction_order'].index(a['name']))
        guide_places.extend(dict(name=a['name'], aliases=a['aliases'], description=a['description'], municipality=guide['name'],
                                 location=guide['name'], category=a['category'], sourceUrl=guide['source_url'],
                                 source_file=guide['source_file'], source_page=a['source_page'], snapshot_date=guide['source_date'])
                            for a in ordered)
    return guide_places


def get_city_guides(destination):
    return [public_guide(g) for g in matching_city_guides(destination, _city_guides)]


def get_foods_by_destination(destination):
    if _client is not None:
        return get_foods(destination, _client.get_default_database(default='multraverse'))
    # Food retrieval must also work when the independent phrase cache is incomplete.
    if os.getenv('MONGODB_URI'):
        try:
            with MongoClient(os.environ['MONGODB_URI'], serverSelectionTimeoutMS=3000, connectTimeoutMS=3000) as client:
                return get_foods(destination, client.get_default_database(default='multraverse'))
        except Exception:
            pass
    return get_foods(destination)


def answer_knowledge(prompt):
    if is_fare_query(prompt):
        return json.dumps({'fare_reference': fare_reference(prompt)}, ensure_ascii=False)
    if any(term in prompt.casefold() for term in ('food', 'eat', 'dish', 'delicac', 'pasalubong')):
        from local_foods import REFERENCE
        localities = {locality for food in REFERENCE['foods'] for locality in food['localities']}
        from knowledge import normalize
        matches = [locality for locality in localities if normalize(locality) != 'pangasinan'
                   and re.search(r'\b' + re.escape(normalize(locality)) + r'\b', normalize(prompt))]
        foods = [food for locality in sorted(matches) for food in get_foods_by_destination(locality)]
        if not matches and 'pangasinan' in prompt.casefold():
            foods = REFERENCE['foods']
        if foods:
            return json.dumps({'local_foods': foods, 'note': REFERENCE['note']}, ensure_ascii=False)
    guides = get_city_guides(prompt)
    if guides:
        return json.dumps({'city_guides': guides}, ensure_ascii=False)
    return ('No matching destination was found in the selected guides. Supported areas: '
            'Dagupan, Alaminos, Urdaneta, San Carlos, Lingayen, Manaoag and Bolinao.')


def get_all_phrases_by_category(category=None):
    return [p for p in _cache['phrases'] if not category or p['category'] == category]


def close_db():
    global _client
    if _client is not None:
        _client.close()
    _client = None
