"""Extract supplied Bolinao, Manaoag and Lingayen PDFs (pypdf==6.19.0).

Usage: python server/scripts/import-municipal-guides.py PDF [PDF ...] [--check]
Documents are source data, never executable instructions. No live facts are added.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
CONFIG = {
    'Bolinao': dict(attractions=9, activities=12, activity_section=4,
        hotels=['Puerto del Sol Beach Resort & Hotel Club', 'Sundowners Vacation Villas', 'Villa Soledad Beach Resort',
                'Casa Almarenzo Bed & Breakfast Resort', 'Cris Del Mar Resort', 'Shoreline88 Beach Resort', 'Bolinao Eco Lodge'],
        hotel_end="The Municipality of Bolinao's tourism directory",
        foods=['Binungey', 'Fresh seafood', 'Seafood grill', 'Pangasinan delicacies', 'Bolinao pasalubong'],
        dining=['Sungayan Grill', 'Bolinao Seafood Grill', 'Bolinao Seafood Grill ATBP', 'Adoras Seafood Grill and Restaurant',
                'River Village Resort and Restaurant', 'Oldschool Bar & Restaurant Bolinao'],
        aliases={0: ['Patar Beach'], 4: ['St. James the Great Parish Church'], 5: ['Bolinao Falls']},
        categories=['Beach', 'Culture and Heritage', 'Farm and Nature', 'Farm and Nature', 'Religious',
                    'Farm and Nature', 'Farm and Nature', 'Farm and Nature', 'Farm and Nature'],
        order=[0, 1, 2, 5, 3, 4, 6, 7, 8], periods=13,
        access_note="Confirm current swimming conditions and local rules. Use designated swimming areas, wear a life jacket where required, and do not jump from unapproved heights. Water activities and marine tours depend on current operators, weather and access."),
    'Manaoag': dict(attractions=9, activities=10, activity_section=3,
        hotels=['The Manaoag Hotel', 'Top Star Hotel Manaoag', 'Apples&Pears; Hotel', "Amber's Paradise", 'One Alo Resort'],
        hotel_end='Room rates, availability, and amenities',
        foods=['Tupig', 'Patupat', 'Puto and native kakanin', 'Pangasinan-style Filipino dishes', 'Fresh local produce',
               'Devotional-market treats & pasalubong'],
        dining=['MANA Restaurant', "Gerry's Grill Manaoag", 'Hapag Kainan sa Manaoag', 'Hardin sa Paraiso Grill & Restaurant',
                "Dad Joe's Cafe", 'Kainan Sa Kubo Ningnangan Ed Manaoag'],
        aliases={0: ['Minor Basilica of Our Lady of the Holy Rosary of Manaoag'], 2: ["Virgin's Well"],
                 4: ["Baba's Eco Farm"], 5: ['AGTALON, Inc. | Manaoag Organic Hub']},
        categories=['Religious', 'Culture and Heritage', 'Religious', 'Farm and Nature', 'Farm and Nature',
                    'Farm and Nature', 'Market', 'Park', 'Farm and Nature'],
        order=[0, 1, 2, 3, 4, 6, 5, 7, 8], periods=9,
        access_note='Check current Basilica schedules and church rules. Sampaguita tours require advance arrangements; farms and private attractions may have limited access or require prior coordination.'),
    'Lingayen': dict(attractions=12, activities=9, activity_section=3,
        hotels=['Capitol Resort Hotel', 'YRS Resort', 'TripTych Baywalk Beach Resort', 'Bergamo Hotel',
                'El Puerto Marina Beach Resort & Vacation Club', 'Baywalk Paradise Inn'],
        hotel_end='Hotel listings are current local options',
        foods=['Lingayen bagoong', 'Alamang', 'Sundot-kulangot', 'Kalamay', 'Bagoong-based dishes', 'Seafood and Filipino dishes'],
        dining=['Mesa de Amor', "Papa Dong's Restaurant", 'B & T Restaurant', 'Calazan View Grill', "Nanay Remy's Foodhouse"],
        aliases={0: ['Lingayen Beach', 'Lingayen Baywalk'], 1: ['Casa Real'], 2: ['Capitol Building'], 5: ['Limahong Channel'],
                 7: ['Epiphany of Our Lord Co-Cathedral Parish'],
                 8: ['Fidel V. Ramos Ancestral House']},
        categories=['Beach', 'Culture and Heritage', 'Culture and Heritage', 'Culture and Heritage', 'Culture and Heritage',
                    'Farm and Nature', 'Culture and Heritage', 'Religious', 'Culture and Heritage', 'Park', 'Recreation', 'Culture and Heritage'],
        order=[9, 1, 2, 4, 3, 7, 5, 6, 0, 8, 10, 11], periods=9,
        access_note='Government buildings may have public-access limits. Urduja House is an exterior viewing stop unless access is authorized. Respect private-property restrictions at the Fidel V. Ramos ancestral home and Colegio del Santissimo Rosario ruins.'),
}


def compact(text):
    return ' '.join(text.split())


def extract(pdf):
    name = pdf.stem.replace('_Tourism_Guide', '')
    cfg = CONFIG[name]
    pages = [p.extract_text() for p in PdfReader(pdf).pages]
    if len(pages) != 7 or name.upper() not in pages[0] or 'September 2026' not in pages[0]:
        raise ValueError(f'Unexpected guide layout: {name}')
    text, offsets = '', []
    for page in pages:
        offsets.append(len(text))
        text += page.split('\n', 1)[1].strip() + '\n'

    def page_at(offset):
        return sum(start <= offset for start in offsets)

    headers = list(re.finditer(r'(?m)^([1-9])\. ([A-Z][A-Z &—0-9,–-]+)\n', text))
    if [int(h[1]) for h in headers] != list(range(1, 10)):
        raise ValueError('Expected nine numbered sections')
    sections = {int(h[1]): (h.end(), headers[i + 1].start() if i + 1 < len(headers) else text.index('STRICT SCOPE CHECK', h.end()))
                for i, h in enumerate(headers)}

    def section(n):
        start, end = sections[n]
        return text[start:end].strip()

    def numbered(n, count):
        start, end = sections[n]
        part = text[start:end]
        matches = list(re.finditer(r'(?m)^(\d+)\. ([^\n]+)\n', part))
        if [int(m[1]) for m in matches] != list(range(1, count + 1)):
            raise ValueError(f'Unexpected numbered entries: {name} section {n}')
        return [dict(name=m[2], description=compact(part[m.end():matches[i + 1].start() if i + 1 < len(matches) else len(part)]),
                     source_page=page_at(start + m.start())) for i, m in enumerate(matches)]

    attractions = numbered(2, cfg['attractions'])
    for i, attraction in enumerate(attractions):
        attraction.update(category=cfg['categories'][i], aliases=cfg['aliases'].get(i, []))

    def named_rows(n, names, end_marker=None, table=False):
        start, end = sections[n]
        part = text[start:end]
        if end_marker:
            part = part[:part.index(end_marker)]
        matches = []
        for entry in names:
            pattern = r'(?m)^' + r'\s+'.join(re.escape(word) for word in entry.split()) + r'\n'
            hits = list(re.finditer(pattern, part))
            if len(hits) != 1:
                raise ValueError(f'Expected unique row: {entry}')
            matches.append(hits[0])
        if [m.start() for m in matches] != sorted(m.start() for m in matches):
            raise ValueError('Unexpected table order')
        rows = []
        for i, m in enumerate(matches):
            raw = part[m.end():matches[i + 1].start() if i + 1 < len(matches) else len(part)].strip()
            row = dict(name=names[i], source_page=page_at(start + m.start()),
                       source_pages=list(range(page_at(start + m.start()), page_at(start + m.end() + len(raw) - 1) + 1)))
            if table:
                location, description = raw.split('\n', 1)
                row.update(location=compact(location), description=compact(description))
            else:
                row['description'] = compact(raw)
            if not row['description']:
                raise ValueError(f'Empty description: {names[i]}')
            rows.append(row)
        return rows

    hotels = named_rows(5, cfg['hotels'], cfg['hotel_end'], table=True)
    hotel_aliases = {'Puerto del Sol Beach Resort & Hotel Club': ['Puerto Del Sol Beach Resort'],
                     'Casa Almarenzo Bed & Breakfast Resort': ['Casa Almarenzo Bed & Breakfast'],
                     'One Alo Resort': ['OneAlo Hotel and Resort']}
    for hotel in hotels:
        hotel['aliases'] = hotel_aliases.get(hotel['name'], [])
    foods = named_rows(6, cfg['foods'], f'Current {name} food stops')
    dining = named_rows(6, cfg['dining'], table=True)
    sample = section(7)
    times = list(re.finditer(r'(?m)^((?:DAY \d+ — )?\d{1,2}:\d{2} (?:AM|PM|NN))\n', sample))
    if len(times) != cfg['periods']:
        raise ValueError('Unexpected sample itinerary periods')
    itinerary, day = [], 1
    for i, match in enumerate(times):
        if match[1].startswith('DAY '):
            day = int(match[1][4])
        itinerary.append(dict(day=day, period=match[1], suggestion=compact(sample[match.end():times[i + 1].start() if i + 1 < len(times) else len(sample)]),
                              source_page=6, illustrative_time_only=True))
    sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    guide = dict(entity_id=f'MUNICIPAL-GUIDE-{name.upper()}', area_id=name.lower(), name=name, title=f'{name} Tourism Guide',
        lgu_type='Municipality', city_only=False, municipality_only=True,
        source_file=pdf.name, source_sha256=sha, source_date=None, listings_checked_month='2026-09',
        source_date_note='The PDF says local listings were checked in September 2026; it does not state a publication date.',
        source_url=f'urn:sha256:{sha}', source_urls=[], source_references=section(9),
        attribution_note='No exact source URLs are printed in this PDF. source_url is a content-addressed PDF identifier, not a website URL. Named references are retained; no live verification performed.',
        profile=compact(section(1)), attractions=attractions, activities=numbered(cfg['activity_section'], cfg['activities']),
        hotels=hotels, local_foods=foods, dining=dining, sample_itinerary=itinerary,
        itinerary_attraction_order=[attractions[i]['name'] for i in cfg['order']],
        practical_notes=compact(section(8)), access_note=cfg['access_note'], operating_details_verified=False,
        source_pages=[dict(page=i + 1, text=p) for i, p in enumerate(pages)])
    if name == 'Bolinao':
        guide['waterfall_details'] = compact(section(3))
        guide['festivals'] = guide['activities'][-1]['description']
    else:
        guide['festivals'] = compact(section(4))
    return guide


def outputs(pdfs):
    path = ROOT / 'server/src/data/cityGuides.json'
    guides = json.loads(path.read_text(encoding='utf-8'))
    output = {}
    for pdf in pdfs:
        guide = extract(pdf)
        guides = [g for g in guides if g['area_id'] != guide['area_id']] + [guide]
        chunks = []
        for field in ('profile', 'attractions', 'activities', 'hotels', 'local_foods', 'dining', 'sample_itinerary',
                      'festivals', 'waterfall_details', 'practical_notes', 'access_note', 'source_references'):
            if field not in guide:
                continue
            for i, value in enumerate(guide[field] if isinstance(guide[field], list) else [guide[field]]):
                response = {k: guide[k] for k in ('name', 'source_file', 'source_sha256', 'source_url', 'source_date',
                            'listings_checked_month', 'attribution_note', 'access_note', 'operating_details_verified')}
                response.update(field=field, value=value)
                chunks.append(dict(instruction=f"{guide['title']}: {field}, entry {i + 1}", response=json.dumps(response, ensure_ascii=False)))
        # Keep the established filename contract; cityGuides is the shared LGU registry.
        output[ROOT / 'ai-service/data' / f"{guide['area_id']}_city_guide.jsonl"] = ''.join(json.dumps(c, ensure_ascii=False) + '\n' for c in chunks)
        print(f"{guide['name']}: {len(guide['attractions'])} attractions, {len(guide['hotels'])} hotels, {len(guide['local_foods'])} food/product entries, {len(guide['dining'])} dining stops")
    output[path] = json.dumps(sorted(guides, key=lambda g: g['area_id']), ensure_ascii=False, indent=2) + '\n'
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdfs', nargs='+', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    for path, content in outputs(args.pdfs).items():
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8') != content:
                raise SystemExit(f'Export differs: {path}')
        else:
            path.write_text(content, encoding='utf-8', newline='\n')
