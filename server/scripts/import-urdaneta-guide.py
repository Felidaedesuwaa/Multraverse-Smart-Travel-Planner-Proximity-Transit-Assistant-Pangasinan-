"""Extract the supplied five-page Urdaneta PDF as source data, not instructions.

Usage: python server/scripts/import-urdaneta-guide.py PATH_TO_PDF [--check]
Requires pypdf==6.19.0.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
ATTRACTIONS = [
    ('Museo de Urdaneta / Urdaneta City New Museum', 'Culture and Heritage', ['Museo de Urdaneta', 'Urdaneta City New Museum']),
    ('Cathedral of Our Lady of the Immaculate Conception', 'Religious', ['Our Lady of Immaculate Conception Cathedral']),
    ("Urdaneta City People's Park", 'Park', []),
    ('Urdaneta City Cultural Center', 'Culture and Heritage', []),
    ('Urdaneta City Public Market', 'Market', []),
    ("Urdaneta Farmer's Market / Agricultural Trading Areas", 'Market', []),
    ('Rice Fields of Urdaneta', 'Farm and Nature', []),
    ('Cattle Market / Livestock Area', 'Farm and Nature', []),
    ('Cabaruan', 'Farm and Nature', []),
    ('Sugcong', 'Farm and Nature', []),
    ('Oltama Rolling Hills', 'Farm and Nature', []),
]
HOTELS = ['Levo Hotel', 'Lisland Rainforest Resort', 'Goldland Spring Resort and Hotel', "Saroju's Farmview Hotel", 'Mini Heart Resort']
FOODS = ['Tinapang Manok', 'Tinapa / Smoked Fish', 'Smoked & Marinated Bangus', 'Rabbit Meat Products',
         'Kamoteng Biko', 'Hopia', 'Peanut Butter', 'Pansit / Local Noodles', 'Buko Pie', 'Papaya Pickles']
ACTIVITIES = ['Market and food tour', 'Agricultural sightseeing', 'Photography at rice fields',
              "Relax at People's Park", 'Resort day', 'Food tourism', 'Festival and cultural events']
DINING = ["Matutina–Gerry's Seafood House", 'BountiFULL restaurant', "Primo's Bistro & Café", 'Janchi Korean Restaurant', 'Kuya J']


def compact(text):
    return ' '.join(text.split())


def between(text, start, end):
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f'Guide layout changed near {start!r}')
    return text.split(start, 1)[1].split(end, 1)[0].strip()


def extract(pdf):
    pages = [p.extract_text() for p in PdfReader(pdf).pages]
    if len(pages) != 5 or 'URDANETA CITY' not in pages[0]:
        raise ValueError('Expected the five-page Urdaneta guide')
    attractions = []
    for i, (name, category, aliases) in enumerate(ATTRACTIONS):
        end = ATTRACTIONS[i + 1][0] if i + 1 < len(ATTRACTIONS) else 'ACTIVITIES TO DO'
        attractions.append(dict(name=name, category=category, aliases=aliases,
            description=compact(between(pages[1], '\n' + name + '\n', '\n' + end + '\n')), source_page=2))
    hotels = []
    for i, name in enumerate(HOTELS):
        end = HOTELS[i + 1] if i + 1 < len(HOTELS) else 'Hotel names and locations above'
        lines = between(pages[2], '\n' + name + '\n', '\n' + end).splitlines()
        if len(lines) != 2:
            raise ValueError(f'Unexpected hotel table: {name}')
        hotels.append(dict(name=name, location=lines[0], description=lines[1], source_page=3))
    foods = []
    for i, name in enumerate(FOODS):
        end = FOODS[i + 1] if i + 1 < len(FOODS) else '__END__'
        foods.append(dict(name=name, description=compact(between(pages[2] + '\n__END__', '\n' + name + '\n', '\n' + end)), source_page=3))
    activities = [dict(name='City heritage tour', description=compact(pages[1].split('\nCity heritage tour\n')[1]), source_page=2)]
    for i, name in enumerate(ACTIVITIES):
        end = ACTIVITIES[i + 1] if i + 1 < len(ACTIVITIES) else 'HOTELS & RESORTS'
        activities.append(dict(name=name, description=compact(between(pages[2], '\n' + name + '\n', '\n' + end)), source_page=3))
    dining_note = compact(between(pages[3], 'RESTAURANTS & FOOD STOPS', 'SAMPLE 1-DAY URDANETA CITY ITINERARY'))
    if any(name not in dining_note for name in DINING):
        raise ValueError('Missing named dining entry')
    periods = ['Morning', 'Late morning', 'Lunch', 'Afternoon', 'Late afternoon', 'Evening']
    itinerary = [dict(period=p, suggestion=compact(between(pages[3], '\n' + p + '\n',
        '\n' + (periods[i + 1] if i + 1 < len(periods) else 'FESTIVALS & EVENTS'))), source_page=4) for i, p in enumerate(periods)]
    urls = re.findall(r'https://[^\s]+', pages[4])
    if len(urls) != 4:
        raise ValueError('Expected four explicit source URLs')
    return dict(entity_id='CITY-GUIDE-URDANETA', area_id='urdaneta', name='Urdaneta City', title='Urdaneta City Tourism Guide',
        source_file=pdf.name, source_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(), source_date=None,
        source_date_note='No guide publication date is stated. The cited 2022 articles are not the guide date.',
        source_url=urls[0], source_urls=urls, city_only=True,
        attribution_note='Source-attributed PDF extraction. Local listings are not individually linked. No live verification performed.',
        profile=compact(between(pages[1], 'WELCOME TO URDANETA CITY', 'PLACES TO VISIT & ATTRACTIONS')),
        attractions=attractions, hotels=hotels, local_foods=foods, dining=[dict(name=n, source_page=4) for n in DINING],
        dining_note=dining_note, activities=activities, sample_itinerary=itinerary,
        itinerary_attraction_order=[ATTRACTIONS[i][0] for i in (4, 1, 0, 2, 3, 5, 6, 7, 10, 8, 9)],
        festivals=compact(pages[3].split('FESTIVALS & EVENTS\n')[1]),
        practical_notes=compact(between(pages[4], 'PRACTICAL TRAVEL NOTES', '\nSOURCES\n')),
        access_note=compact(between(pages[4], '\nRespect private farmland\n', '\nCheck event schedules')),
        operating_details_verified=False, source_pages=[dict(page=i + 1, text=t) for i, t in enumerate(pages)])


def outputs(pdf):
    guide = extract(pdf)
    path = ROOT / 'server/src/data/cityGuides.json'
    guides = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    guides = sorted([g for g in guides if g['area_id'] != guide['area_id']] + [guide], key=lambda g: g['area_id'])
    chunks = []
    for field in ('profile', 'attractions', 'hotels', 'local_foods', 'dining', 'dining_note', 'activities',
                  'sample_itinerary', 'festivals', 'practical_notes', 'access_note'):
        for i, value in enumerate(guide[field] if isinstance(guide[field], list) else [guide[field]]):
            response = dict(city=guide['name'], source_file=guide['source_file'], source_sha256=guide['source_sha256'],
                source_url=guide['source_url'], source_date=None, operating_details_verified=False,
                access_note=guide['access_note'], field=field, value=value)
            chunks.append(dict(instruction=f'Urdaneta City Tourism Guide: {field}, entry {i + 1}', response=json.dumps(response, ensure_ascii=False)))
    return {path: json.dumps(guides, ensure_ascii=False, indent=2) + '\n',
        ROOT / 'ai-service/data/urdaneta_city_guide.jsonl': ''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in chunks)}


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
    print('Validated Urdaneta: 11 attractions, 5 hotels, 10 foods, 5 dining options, 8 activities, 6 itinerary periods; 5 source pages retained.')
