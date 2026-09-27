"""Extract the supplied five-page San Carlos guide (pypdf==6.19.0).

Usage: python server/scripts/import-san-carlos-guide.py PATH_TO_PDF [--check]
PDF text is source data, not executable instructions.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
ATTRACTIONS = [
    ('Minor Basilica of Saint Dominic de Guzman', 'Religious', ['Minor Basilica of Saint Dominic', 'Minor Basilica of St. Dominic']),
    ('Speaker Eugenio Perez Memorial Building / Museum', 'Culture and Heritage', ['Speaker Eugenio Perez Memorial Building']),
    ('City Plaza', 'Park', []),
    ('Binalatongan Ruins', 'Culture and Heritage', []),
    ('Quadricentennial Arch', 'Culture and Heritage', []),
    ('Philippine Fruit Corporation / Mango-related Agri-Industry', 'Farm and Nature', ['Philippine Fruit Corporation']),
    ('Bamboo Craft & Furniture Areas', 'Culture and Heritage', []),
    ('Oltama / Rural Landscape Areas', 'Farm and Nature', []),
    ('City Parks & Public Spaces', 'Park', []),
]
HOTELS = ['Kabaleyan Cove Resort', 'Golden Castle Resort', 'JRJ Lodge (formerly Mendoza Travelers Hotel)',
          "Anthony's Private Resort", "Kevin's Resort"]
FOODS = ['San Carlos Carabao Mangoes', 'Mango Pie', 'Mango-based treats', 'Pangasinan Rice Cakes & Delicacies',
         'Filipino grilled and comfort food', 'Fresh farm produce']
ACTIVITIES = ['Heritage walking tour', 'Museum visit', 'Mango food trip', 'Bamboo craft shopping',
              'Bamboo-industry visit', 'Farm and countryside sightseeing', 'Resort day', 'Festival activities', 'Local food crawl']
DINING = ["Roberto's Backyard", "Geo's Restaurant", 'Raguz Grill and Restaurant', "Adela's Burgers", "Jem's Cuisine"]


def compact(text):
    return ' '.join(text.split())


def between(text, start, end):
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f'Guide layout changed near {start!r}')
    return text.split(start, 1)[1].split(end, 1)[0].strip()


def extract(pdf):
    pages = [p.extract_text() for p in PdfReader(pdf).pages]
    if len(pages) != 5 or 'SAN CARLOS CITY' not in pages[0]:
        raise ValueError('Expected the five-page San Carlos guide')
    attractions = []
    for i, (name, category, aliases) in enumerate(ATTRACTIONS):
        end = ATTRACTIONS[i + 1][0] if i + 1 < len(ATTRACTIONS) else 'ACTIVITIES TO DO'
        attractions.append(dict(name=name, category=category, aliases=aliases,
            description=compact(between(pages[1], '\n' + name + '\n', '\n' + end + '\n')), source_page=2))
    hotels = []
    for i, name in enumerate(HOTELS):
        end = HOTELS[i + 1] if i + 1 < len(HOTELS) else 'Hotel and resort availability,'
        lines = between(pages[2], '\n' + name + '\n', '\n' + end).splitlines()
        if len(lines) != 2:
            raise ValueError(f'Unexpected hotel table: {name}')
        hotels.append(dict(name=name, location=lines[0], description=lines[1], source_page=3,
            aliases=['JRJ Lodge', 'Mendoza Travelers Hotel'] if name.startswith('JRJ Lodge') else []))
    # Strip repeating page/table headers before joining the cross-page sections.
    food_text = pages[2] + '\n' + pages[3].split('What to try\n', 1)[1]
    foods = []
    for i, name in enumerate(FOODS):
        end = FOODS[i + 1] if i + 1 < len(FOODS) else 'RESTAURANTS & FOOD STOPS'
        foods.append(dict(name=name, description=compact(between(food_text, '\n' + name + '\n', '\n' + end + '\n')),
            source_page=4 if i == 5 else 3))
    activity_text = pages[1].rstrip() + '\n' + pages[2].split('\n', 1)[1]
    activities = []
    for i, name in enumerate(ACTIVITIES):
        end = ACTIVITIES[i + 1] if i + 1 < len(ACTIVITIES) else 'MANGO-BAMBOO FESTIVAL'
        activities.append(dict(name=name, description=compact(between(activity_text, '\n' + name + '\n', '\n' + end + '\n')),
            source_page=2 if i < 3 else 3, source_pages=[2, 3] if i == 2 else [2 if i < 2 else 3]))
    dining_note = compact(between(pages[3], 'RESTAURANTS & FOOD STOPS', 'SAMPLE 1-DAY SAN CARLOS CITY ITINERARY'))
    if any(name not in dining_note for name in DINING):
        raise ValueError('Missing named dining entry')
    periods = ['Morning', 'Late morning', 'Lunch', 'Afternoon', 'Late afternoon', 'Evening']
    itinerary = [dict(period=p, suggestion=compact(between(pages[3] + '\n__END__', '\n' + p + '\n',
        '\n' + (periods[i + 1] if i + 1 < len(periods) else '__END__'))), source_page=4) for i, p in enumerate(periods)]
    urls = re.findall(r'https://[^\s]+', pages[4])
    if len(urls) != 5:
        raise ValueError('Expected five explicit source URLs')
    return dict(entity_id='CITY-GUIDE-SAN-CARLOS', area_id='san-carlos', name='San Carlos City', title='San Carlos City Tourism Guide',
        source_file=pdf.name, source_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(), source_date=None,
        source_date_note='No guide publication date is stated. Historical events and cited article years are not the guide date.',
        source_url=urls[0], source_urls=urls, city_only=True,
        attribution_note='Source-attributed PDF extraction. Local listings are not individually linked. No live verification performed.',
        profile=compact(between(pages[1], 'WELCOME TO SAN CARLOS CITY', 'PLACES TO VISIT & ATTRACTIONS')),
        attractions=attractions, hotels=hotels, local_foods=foods, dining=[dict(name=n, source_page=4) for n in DINING],
        dining_note=dining_note, activities=activities, sample_itinerary=itinerary,
        itinerary_attraction_order=[ATTRACTIONS[i][0] for i in (2, 0, 1, 6, 3, 4, 5, 7, 8)],
        festivals=compact(between(pages[2], '\nMANGO-BAMBOO FESTIVAL\n', '\nHOTELS & RESORTS')),
        practical_notes=compact(between(pages[4], 'PRACTICAL TRAVEL NOTES', '\nSOURCES\n')),
        access_note=compact(between(pages[4], '\nFarm visits\n', '\nFestival schedules')),
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
            chunks.append(dict(instruction=f'San Carlos City Tourism Guide: {field}, entry {i + 1}', response=json.dumps(response, ensure_ascii=False)))
    return {path: json.dumps(guides, ensure_ascii=False, indent=2) + '\n',
        ROOT / 'ai-service/data/san-carlos_city_guide.jsonl': ''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in chunks)}


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
    print('Validated San Carlos: 9 attractions, 5 hotels, 6 foods, 5 dining options, 9 activities, 6 itinerary periods; 5 pages retained.')
