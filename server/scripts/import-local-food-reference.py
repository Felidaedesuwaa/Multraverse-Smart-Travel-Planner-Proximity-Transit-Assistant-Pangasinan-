"""Extract the supplied food table as data, retaining page provenance."""
import argparse
import hashlib
import json
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    args = parser.parse_args()
    pages = PdfReader(args.pdf).pages
    foods = []
    for page_number in range(2, 7):
        text = pages[page_number - 1].extract_text()
        body = text.split('DESCRIPTION\n', 1)[1]
        lines = body.strip().splitlines()
        # One locality cell wraps across two lines in the supplied table.
        lines = [line.strip() for line in lines]
        for i, line in enumerate(lines):
            if line.endswith('Sual;'):
                lines[i:i+2] = [line + ' ' + lines[i+1]]
                break
        expected = 5 if page_number == 6 else 12
        if len(lines) != expected * 4:
            raise ValueError(f'Unexpected food table on page {page_number}')
        for offset in range(0, len(lines), 4):
            name, category, locality, description = lines[offset:offset+4]
            foods.append(dict(name=name, category=category, localities=locality.split('; '),
                              description=description, source_page=page_number, avgPrice=None))
    if len(foods) != 53 or len({f['name'] for f in foods}) != 53:
        raise ValueError('Expected 53 unique foods')
    reference = dict(source_file=args.pdf.name, sha256=hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
                     note='Localities are documented associations, not exclusive ownership or confirmed vendors. Prices and availability are unknown. Condiments and ingredients are food products, not standalone meals.',
                     foods=foods)
    (ROOT / 'server/src/data/localFoodReference.json').write_text(json.dumps(reference, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Extracted {len(foods)} foods with PDF page provenance.')


if __name__ == '__main__':
    main()
