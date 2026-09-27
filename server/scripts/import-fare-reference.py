"""Import the supplied fare compilation as source data, never instructions.

Run with a PDF path; --check compares the retained extraction without writing.
"""
import argparse
import hashlib
import json
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[2]
SECTIONS = [
    ('tricycle', 2, 2, 'Alaminos City only; amended 2018 ordinance, with superseded table retained.'),
    ('jeepney', 3, 4, 'Source explicitly says Mega Manila; Pangasinan applicability requires confirmation.'),
    ('bus-ordinary', 5, 6, 'Provincial bus; NEW rates effective 2026-09-28. Keep OLD rates separate.'),
    ('bus-aircon', 7, 8, 'Provincial regular aircon bus; NEW rates effective 2026-09-28. Keep OLD rates separate.'),
    ('bus-deluxe', 9, 10, 'Provincial deluxe bus; NEW rates effective 2026-09-28. Keep OLD rates separate.'),
    ('bus-super-deluxe', 11, 12, 'Provincial super deluxe bus; NEW rates effective 2026-09-28. Keep OLD rates separate.'),
    ('bus-historical', 13, 14, 'Historical October 2022 provincial ordinary bus reference.'),
    ('van-traditional', 15, 15, 'Traditional UV Express; PHP 2.60/km effective 2026-09-28; eligible discount 20%.'),
    ('van-modern', 16, 16, 'Modern UV Express; PHP 3.00/km effective 2026-09-28; eligible discount 20%.'),
    ('hundred-islands-undated', 17, 17, 'Hundred Islands only; undated source, current prices unverified.'),
    ('hundred-islands-historical', 18, 18, 'Hundred Islands only; historical 2018 source. Do not combine with undated fees.'),
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    pages = [p.extract_text() for p in PdfReader(args.pdf).pages]
    if len(pages) != 18 or 'NEW TRICYCLE FARE RATE' not in pages[1] or 'MODERN UV EXPRESS' not in pages[15]:
        raise ValueError('Unexpected PDF layout; review extraction before importing')
    reference = dict(source_file=args.pdf.name, sha256=hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
        currency='PHP', availability='All Pangasinan cities and municipalities', current_rate_verified=False,
        note='Source reference, not a confirmed current quote. Select the vehicle class, travel date, eligible discount and actual billed route distance. Use listed table values; never infer fares from straight-line distance. Local and historical rates retain their original scope. Unknown charges are not zero.',
        conventions=pages[0], sections=[dict(id=key, first_page=start, last_page=end, scope=scope,
            text='\n'.join(pages[start-1:end])) for key, start, end, scope in SECTIONS])
    target = ROOT / 'server/src/data/pangasinanFares.json'
    output = json.dumps(reference, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        assert target.read_text(encoding='utf-8') == output, 'Retained reference differs from PDF'
    else:
        target.write_text(output, encoding='utf-8')
    print(f'{len(pages)} pages; {len(reference["sections"])} sections; source hash {reference["sha256"]}')


if __name__ == '__main__':
    main()
