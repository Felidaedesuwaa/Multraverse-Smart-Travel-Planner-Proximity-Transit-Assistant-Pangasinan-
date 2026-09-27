"""Phrasebook V2 and the seven selected local guides."""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent


def source_phrases():
    literal = r'''('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*")'''
    pattern = r'\{\s*filipino:\s*' + literal + r',\s*pangasinan:\s*' + literal + r',\s*english:\s*' + literal + r',\s*category:\s*' + literal + r'\s*\}'
    text = (ROOT.parent / 'server/prisma/seedPhrasebookV2.ts').read_text(encoding='utf-8')
    text = text.split('export const phrases = [', 1)[1].split('\n]', 1)[0]
    rows = []
    for values in re.findall(pattern, text):
        decoded = [re.sub(r'''\\(['"\\])''', r'\1', value[1:-1]) for value in values]
        rows.append(dict(zip(('filipino', 'pangasinan', 'english', 'category'), decoded)))
    if not rows or len(rows) != len(re.findall(r'\{\s*filipino:', text)):
        raise ValueError('Phrasebook V2 format changed; extraction refused')
    return rows


def source_city_guides():
    guides = json.loads((ROOT.parent / 'server/src/data/cityGuides.json').read_text(encoding='utf-8'))
    if len({g['area_id'] for g in guides}) != len(guides):
        raise ValueError('Duplicate city guide area')
    return guides


def matching_city_guides(destination, guides):
    needle = normalize(destination)
    # A named city takes precedence over generic attraction names such as City Plaza.
    cities = [g for g in guides if re.search(r'\b' + re.escape(normalize(g['name'])) + r'\b', needle)]
    if cities:
        return cities
    return [g for g in guides if any(re.search(r'\b' + re.escape(normalize(name)) + r'\b', needle)
            for name in [g['name'], *[n for a in g['attractions'] for n in [a['name'], *a['aliases']]]])]


def public_guide(guide):
    return {k: v for k, v in guide.items() if k != 'source_pages'}


def normalize(text):
    text = text.casefold().replace('sta.', 'santa').replace('sto.', 'santo')
    return ' '.join(re.findall(r'\w+', text.replace(' city', '')))

