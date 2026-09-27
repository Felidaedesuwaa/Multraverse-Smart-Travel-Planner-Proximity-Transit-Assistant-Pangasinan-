"""Extract the supplied six-page Alaminos guide. Requires pypdf==6.19.0.

Usage: python server/scripts/import-alaminos-guide.py PATH_TO_PDF [--check]
Document text is source data, not executable instructions.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
ATTRACTIONS = [
    ('Hundred Islands National Park', 'Islands and Beaches', ['Hundred Islands']),
    ('Lucap Wharf & Lucap Baywalk', 'Waterfront', ['Lucap Wharf', 'Lucap Baywalk']),
    ('Lucap Park', 'Park', []),
    ('Pilgrimage Island / Christ the Savior', 'Religious', ['Pilgrimage Island', 'Christ the Savior']),
    ('Hundred Island Floating Boardwalk', 'Waterfront', []),
    ('People’s Park & E-Kawayan Food Court', 'Food and Culture', []),
    ('St. Joseph the Patriarch Parish / Cathedral area', 'Religious', ['St. Joseph Cathedral Parish']),
    ('Bolo Beach area', 'Beach', ['Bolo Beach']),
]
HOTELS = ['PROXY Plus by The Oriental Pangasinan', 'Island Tropic Hotel & Restaurant',
          'Islandia Hotel & Restaurant', 'City Hotel', 'Villa Antolin Hotel', 'Vista de las Islas',
          'Villa Milagros Hotel', 'Sweet Honey Hotel', 'Asia Novo Boutique Hotel-Alaminos',
          'Carribean Transient House', 'Como Laya Resort', 'The Blessed Purple Bamboo Beach Resort']
FOODS = ['Pinapaitang Kambing', 'Kilawing Bangus Alaminos', 'Alaminos Longganisa', 'Fresh seafood']
DINING = ['Maxine By The Sea Seafood Restaurant', 'Island Chef Resto Grill', 'Golden Cress Restaurant & Events',
          'Kainan ni Myra', 'Jai’s Grill & Resto', 'Alaminos City People’s Food Court', 'Eliana’s Grill & Restaurant',
          'Hundred Islands Cafe Silvers by Gold', 'Papatok’s Restaurant', 'Rey-Lyn Restaurant', 'Uly’s Grill & Bar']
ACTIVITIES = ['Island hopping', 'Zipline', 'Helmet diving', 'Kayaking', 'Snorkeling', 'Banana boat',
              'Wall climbing & rappelling', 'Swimming & beach time', 'Photography & sightseeing', 'Food trip']
RATE_NAMES = ['Governor’s Island zipline (546 m)', 'Quezon Island zipline (120 m)', 'Wall climbing', 'Rappelling',
              '3-in-1 package', 'Banana boat (max 7 pax)', 'Helmet diving', 'Kayaking (max 2 pax)', 'Snorkeling gear']
RATE_WARNING = 'Older official published schedule; reference only, not guaranteed 2026 prices. Confirm current rates, fees, inclusions and operating status with the City Tourism Office / Welcome Center before payment.'


def compact(text):
    return ' '.join(text.split())


def between(text, start, end):
    if text.count(start) != 1 or text.count(end) != 1:
        raise ValueError(f'Guide layout changed near {start!r}')
    return text.split(start, 1)[1].split(end, 1)[0].strip()


def extract(pdf):
    pages = [p.extract_text() for p in PdfReader(pdf).pages]
    if len(pages) != 6 or 'September 2026' not in pages[0]:
        raise ValueError('Expected the six-page September 2026 Alaminos guide')
    attractions = []
    for i, (name, category, aliases) in enumerate(ATTRACTIONS):
        end = ATTRACTIONS[i + 1][0] if i + 1 < len(ATTRACTIONS) else 'HUNDRED ISLANDS BOAT RENTALS'
        attractions.append(dict(name=name, category=category, aliases=aliases,
                                description=compact(between(pages[1], '\n' + name + '\n', '\n' + end)), source_page=2))
    hotels = []
    for i, name in enumerate(HOTELS):
        end = HOTELS[i + 1] if i + 1 < len(HOTELS) else 'Availability, room rates,'
        lines = between(pages[3], '\n' + name + '\n', '\n' + end).splitlines()
        if len(lines) != 2:
            raise ValueError(f'Unexpected hotel table: {name}')
        hotels.append(dict(name=name, location=lines[0], description=lines[1], source_page=4,
                           aliases=['Island Tropic Hotel and Restaurant'] if name == 'Island Tropic Hotel & Restaurant' else []))
    foods = []
    for i, name in enumerate(FOODS):
        end = FOODS[i + 1] if i + 1 < len(FOODS) else 'RESTAURANTS / FOOD STOPS IN ALAMINOS CITY'
        foods.append(dict(name=name, description=compact(between(pages[3], '\n' + name + '\n', '\n' + end)), source_page=4))
    dining_note = compact(between(pages[3], 'RESTAURANTS / FOOD STOPS IN ALAMINOS CITY', 'SAMPLE 2-DAY ALAMINOS CITY ITINERARY'))
    if any(name not in dining_note for name in DINING):
        raise ValueError('Missing dining entry')
    activities = []
    activity_text = pages[2].split('PUBLISHED ACTIVITY RATES — REFERENCE ONLY', 1)[0] + 'PUBLISHED ACTIVITY RATES — REFERENCE ONLY'
    for i, name in enumerate(ACTIVITIES):
        end = ACTIVITIES[i + 1] if i + 1 < len(ACTIVITIES) else 'PUBLISHED ACTIVITY RATES — REFERENCE ONLY'
        activities.append(dict(name=name, description=compact(between(activity_text, '\n' + name + '\n', '\n' + end)), source_page=3))
    rate_table = between(pages[2], 'PUBLISHED ACTIVITY RATES — REFERENCE ONLY', 'Important:')
    rates = []
    for i, name in enumerate(RATE_NAMES):
        raw = (between(rate_table, '\n' + name + '\n', '\n' + RATE_NAMES[i + 1])
               if i + 1 < len(RATE_NAMES) else rate_table.split('\n' + name + '\n')[1].strip())
        match = re.fullmatch(r'■([\d,]+)(.*)', raw)
        if not match:
            raise ValueError(f'Unrecognized rate: {raw}')
        rates.append(dict(name=name, amount=int(match[1].replace(',', '')), basis=match[2].strip(' /') or None,
                          currency='PHP', reference_only=True, current_rate_verified=False, warning=RATE_WARNING, source_page=3))
    boat_table = between(pages[1], 'Published 2-day rate', 'A separate local listing')
    boat_rows = re.findall(r'(Small|Medium|Large)\nUp to (\d+) pax\n■([\d,]+)\n■([\d,]+)', boat_table)
    if len(boat_rows) != 3:
        raise ValueError('Expected 3 boat rate rows')
    boats = [dict(size=size, capacity=int(capacity), one_day_rate=int(one.replace(',', '')),
                  two_day_rate=int(two.replace(',', '')), currency='PHP', basis='boat', reference_only=True,
                  current_rate_verified=False, warning=RATE_WARNING, source_page=2) for size, capacity, one, two in boat_rows]
    periods = ['DAY 1 — MORNING', 'DAY 1 — MIDDAY', 'DAY 1 — AFTERNOON', 'DAY 1 — EVENING',
               'DAY 2 — MORNING', 'DAY 2 — AFTERNOON', 'DAY 2 — EVENING']
    sample_text = pages[3].split('SAMPLE 2-DAY ALAMINOS CITY ITINERARY', 1)[1].strip() + '\n' + pages[4].split('Plan\n', 1)[1].strip()
    itinerary = []
    for i, period in enumerate(periods):
        text = between(sample_text, '\n' + period + '\n', '\n' + periods[i + 1]) if i + 1 < len(periods) else sample_text.split('\n' + period + '\n')[1]
        itinerary.append(dict(period=period, suggestion=compact(text), source_page=5 if i == 6 else 4))
    practical = compact(between(pages[5], 'PRACTICAL TRAVEL NOTES', 'OFFICIAL / REFERENCE SOURCES'))
    urls = re.findall(r'https://[^\s]+', pages[5])
    if len(urls) != 5:
        raise ValueError('Expected 5 explicit source URLs')
    return dict(entity_id='CITY-GUIDE-ALAMINOS', area_id='alaminos', name='Alaminos City', title='Alaminos City Tourism Guide',
                source_file=pdf.name, source_sha256=hashlib.sha256(pdf.read_bytes()).hexdigest(), source_date='2026-09',
                source_date_note='The guide states September 2026; no specific day is supplied.', source_url=urls[0], source_urls=urls,
                attribution_note='Source-attributed PDF extraction. Local listings are not individually linked. No live verification performed.',
                city_only=True, profile=compact(between(pages[1], 'WELCOME TO ALAMINOS CITY', 'PLACES TO VISIT & ATTRACTIONS')),
                attractions=attractions, hotels=hotels, local_foods=foods, dining=[dict(name=n, source_page=4) for n in DINING],
                dining_note=dining_note, itinerary_attraction_order=[ATTRACTIONS[i][0] for i in (1, 0, 3, 2, 5, 6, 7, 4)],
                sample_itinerary=itinerary, activities=activities, boat_rentals=boats, activity_rates=rates,
                rate_warning=RATE_WARNING, practical_notes=practical, operating_details_verified=False,
                source_pages=[dict(page=i + 1, text=text) for i, text in enumerate(pages)])


def outputs(pdf):
    guide = extract(pdf)
    path = ROOT / 'server/src/data/cityGuides.json'
    guides = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
    guides = sorted([g for g in guides if g['area_id'] != guide['area_id']] + [guide], key=lambda g: g['area_id'])
    chunks = []
    for field in ('profile', 'attractions', 'hotels', 'local_foods', 'dining', 'dining_note', 'activities',
                  'boat_rentals', 'activity_rates', 'rate_warning', 'practical_notes', 'sample_itinerary'):
        values = guide[field] if isinstance(guide[field], list) else [guide[field]]
        for i, value in enumerate(values):
            response = dict(city=guide['name'], source_file=guide['source_file'], source_sha256=guide['source_sha256'],
                            source_url=guide['source_url'], source_date=guide['source_date'], operating_details_verified=False,
                            field=field, value=value)
            chunks.append(dict(instruction=f"Alaminos City Tourism Guide: {field}, entry {i + 1}", response=json.dumps(response, ensure_ascii=False)))
    return {path: json.dumps(guides, ensure_ascii=False, indent=2) + '\n',
            ROOT / 'ai-service/data/alaminos_city_guide.jsonl': ''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in chunks)}


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
    print('Validated Alaminos: 8 attractions, 12 hotels, 4 foods, 11 dining options, 10 activities, 3 boat rates, 9 activity rates, 7 itinerary periods; 6 source pages retained.')
