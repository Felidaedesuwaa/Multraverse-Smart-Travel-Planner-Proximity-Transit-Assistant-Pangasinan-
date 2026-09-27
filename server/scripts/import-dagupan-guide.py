"""Extract the supplied four-page Dagupan guide. Requires pypdf==6.19.0.

Usage: python server/scripts/import-dagupan-guide.py PATH_TO_PDF [--check]
The PDF is source data; its editorial instructions are never executed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
ATTRACTIONS = [
    ('Tondaligan Beach / Tondaligan People’s Park', 'Beach', ['Tondaligan Beach', "Tondaligan People's Park"]),
    ('Dawel River Cruise', 'River experience', []),
    ('Dagupan City Museum & City Plaza', 'Culture and Heritage', ['Dagupan City Museum', 'City Plaza & Dagupan City Museum']),
    ('Old St. John Cathedral / St. John the Evangelist', 'Religious', ['Saint John the Evangelist Cathedral', 'Old St. John Cathedral']),
    ('Historic PNR / Spanish Railroad Station Site', 'Culture and Heritage', []),
    ('Gabaldon Building', 'Culture and Heritage', []),
    ('Franklin Bridge Ruins', 'Culture and Heritage', []),
    ('Dagupan Water Tower', 'Culture and Heritage', []),
    ('Bonuan Blue Beach', 'Beach', []),
]
HOTELS = ['Star Plaza Hotel', 'Lenox Hotel', 'HOTEL Monde', 'Bedbox Hotel Dagupan',
          'Damara Hotel at Ciudad Elmina', 'RedDoorz @ Tondaligan Beach Hotel']
FOODS = ['Dagupan Bangus', 'Pigar-Pigar', 'Kaleskes', 'Bagoong / Inasin / Monamon', 'Buko Pastillas', 'Bocayo']
DINING = ['MATUTINA-GERRY’s Seafood House', 'Kainan ni Mang Peping', 'Dad Joe’s Restaurant',
          'Sangkalan Restaurant Dagupan', 'Ciudad Elmina Fishing Village']


def compact(text):
    return ' '.join(text.split())


def between(text, start, end):
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f'Guide layout changed near {start!r}')
    return text.split(start, 1)[1].split(end, 1)[0].strip()


def extract(pdf):
    pages = [p.extract_text() for p in PdfReader(pdf).pages]
    if len(pages) != 4 or 'DAGUPAN CITY' not in pages[0]:
        raise ValueError('Expected the supplied four-page Dagupan City guide')
    attractions = []
    for index, (name, category, aliases) in enumerate(ATTRACTIONS):
        end = ATTRACTIONS[index + 1][0] if index + 1 < len(ATTRACTIONS) else 'Heritage note:'
        attractions.append(dict(name=name, description=compact(between(pages[1], name, end)),
                                category=category, aliases=aliases, source_page=2))
    hotels = []
    for index, name in enumerate(HOTELS):
        end = HOTELS[index + 1] if index + 1 < len(HOTELS) else 'Accommodation prices,'
        lines = between(pages[2], name, end).splitlines()
        if len(lines) != 2:
            raise ValueError(f'Unexpected hotel table layout: {name}')
        hotels.append(dict(name=name, location=lines[0], description=lines[1], source_page=3))
    foods = []
    for index, name in enumerate(FOODS):
        end = FOODS[index + 1] if index + 1 < len(FOODS) else 'DAGUPAN FOOD STOPS'
        foods.append(dict(name=name, description=compact(between(pages[2], '\n' + name + '\n', '\n' + end)), source_page=3))
    dining_text = compact(between(pages[2], 'DAGUPAN FOOD STOPS', 'DAGUPAN’S SIGNATURE FESTIVAL'))
    # Match before whitespace normalization because the first name wraps a line.
    for name in DINING:
        if name not in dining_text:
            raise ValueError(f'Dining name not present: {name}')
    periods = ['Morning', 'Lunch', 'Afternoon', 'Late afternoon', 'Evening']
    sample_text = pages[2].split('SAMPLE 1-DAY DAGUPAN CITY ITINERARY', 1)[1].strip()
    itinerary = []
    for index, period in enumerate(periods):
        description = (between(sample_text, '\n' + period + '\n', '\n' + periods[index + 1] + '\n')
                       if index + 1 < len(periods) else sample_text.split('\nEvening\n', 1)[1])
        itinerary.append(dict(period=period, suggestion=compact(description), source_page=3))
    return dict(entity_id='CITY-GUIDE-DAGUPAN', area_id='dagupan', name='Dagupan City',
                title='Dagupan City Tourism Guide', source_file=pdf.name,
                source_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(), source_date=None,
                source_date_note='No publication or snapshot date is stated in the supplied PDF.',
                source_url='https://dagupan.gov.ph/tourism/',
                source_urls=['https://dagupan.gov.ph/tourism/', 'https://dagupan.gov.ph/the-city/about-dagupan-city/'],
                attribution_note='The PDF cites the city government, DOT and unspecified current local listings; no live verification was performed.',
                city_only=True, profile=compact(between(pages[1], 'WELCOME TO DAGUPAN CITY', 'PLACES TO VISIT & ATTRACTIONS')),
                attractions=attractions, hotels=hotels, local_foods=foods,
                itinerary_attraction_order=[ATTRACTIONS[i][0] for i in (2, 3, 1, 0, 4, 5, 6, 7, 8)],
                dining=[dict(name=name, source_page=3) for name in DINING], dining_note=dining_text,
                festival=compact(between(pages[2], 'DAGUPAN’S SIGNATURE FESTIVAL', 'SAMPLE 1-DAY DAGUPAN CITY ITINERARY')),
                sample_itinerary=itinerary,
                heritage_note=compact(pages[1].split('Heritage note:', 1)[1]),
                operating_details_verified=False,
                source_pages=[dict(page=i + 1, text=text) for i, text in enumerate(pages)])


def outputs(pdf):
    guide = extract(pdf)
    path = ROOT / 'server/src/data/cityGuides.json'
    guides = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    guides = sorted([g for g in guides if g['area_id'] != guide['area_id']] + [guide], key=lambda g: g['area_id'])
    chunks = []
    for field in ('profile', 'attractions', 'hotels', 'local_foods', 'dining', 'dining_note', 'festival', 'sample_itinerary', 'heritage_note'):
        values = guide[field] if isinstance(guide[field], list) else [guide[field]]
        for index, value in enumerate(values):
            response = dict(city=guide['name'], source_file=guide['source_file'], source_sha256=guide['source_sha256'],
                            source_url=guide['source_url'], source_date=None, operating_details_verified=False,
                            field=field, value=value)
            chunks.append(dict(instruction=f"Dagupan City Tourism Guide: {field}, entry {index + 1}",
                               response=json.dumps(response, ensure_ascii=False)))
    return {path: json.dumps(guides, ensure_ascii=False, indent=2) + '\n',
            ROOT / 'ai-service/data/dagupan_city_guide.jsonl': ''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in chunks)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for path, content in outputs(args.pdf).items():
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8') != content:
                raise SystemExit(f'Export differs: {path}')
        else:
            path.write_text(content, encoding='utf-8', newline='\n')
    print('Validated Dagupan: 9 attractions, 6 hotels, 6 foods, 5 dining options, 5 itinerary periods; all 4 source pages retained.')
