"""Source-grounded fare retrieval, available across Pangasinan."""
import json
import re
from knowledge import ROOT


def fare_reference(query=''):
    reference = json.loads((ROOT.parent / 'server/src/data/pangasinanFares.json').read_text(encoding='utf-8'))
    terms = query.casefold()
    kinds = []
    for pattern, kind in [(r'bus', 'bus'), (r'jeep', 'jeepney'), (r'tricycle', 'tricycle'),
                          (r'van|uv express', 'van'), (r'hundred islands|boat|island hopping', 'hundred-islands')]:
        if re.search(pattern, terms):
            kinds.append(kind)
    if kinds:
        reference['sections'] = [s for s in reference['sections'] if any(s['id'].startswith(k) for k in kinds)]
    return reference


def is_fare_query(query):
    return bool(re.search(r'\b(fares?|pamasahe|bus|jeepney|tricycle|uv express|boat|transport rates)\b', query, re.I))
