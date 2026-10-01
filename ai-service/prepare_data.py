"""Rebuild training data using only Phrasebook V2 and the seven selected guides."""
import hashlib
import itertools
import json
from knowledge import ROOT, source_phrases, source_city_guides, source_lodging_guides
from fares import fare_reference


def main():
    records, provenance, seen = [], [], set()
    def add(instruction, response, source, group):
        if instruction in seen:
            raise ValueError(f'Duplicate instruction: {instruction}')
        seen.add(instruction)
        records.append(dict(instruction=instruction, response=response))
        provenance.append(dict(line=len(records), source=source, group=group, review_status='unreviewed'))
    phrases = source_phrases()
    for index, phrase in enumerate(phrases):
        for origin, target in itertools.permutations(('english', 'filipino', 'pangasinan'), 2):
            add(f'Translate from {origin.title()} to {target.title()}: {phrase[origin]}', phrase[target],
                'server/prisma/seedPhrasebookV2.ts', f'phrase:{index + 1}')
    phrase_records = list(records)
    (ROOT.parent / 'server/src/data/phrasebookV2.json').write_text(json.dumps(phrases, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    guides = source_city_guides()
    for guide in guides:
        path = ROOT / 'data' / f"{guide['area_id']}_city_guide.jsonl"
        for line in path.read_text(encoding='utf-8').splitlines():
            chunk = json.loads(line)
            add(chunk['instruction'], chunk['response'], guide['source_file'], guide['entity_id'])
    lodging_guides = source_lodging_guides()
    for lodging in lodging_guides:
        lodging_records = []
        for hotel in lodging['hotels']:
            add(f"What accommodation details are supplied for {hotel['name']} in {lodging['area_id'].replace('-', ' ').title()} City?",
                lodging['note'] + '\n' + json.dumps(hotel, ensure_ascii=False), lodging['source_file'],
                lodging['area_id'].upper() + '-LODGING:' + hotel['accommodation_id'])
            lodging_records.append(records[-1])
        (ROOT / f"data/{lodging['area_id']}_lodging.jsonl").write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in lodging_records), encoding='utf-8')
    reference = fare_reference()
    fare_records = []
    for section in reference['sections']:
        # Small, source-scoped chunks keep table headings and applicability in training.
        lines = section['text'].splitlines()
        for offset in range(0, len(lines), 10):
            instruction = f"Show supplied Pangasinan fare reference {section['id']}, excerpt {offset // 10 + 1}."
            response = reference['note'] + '\n' + section['scope'] + '\n' + '\n'.join(lines[offset:offset+10])
            add(instruction, response, reference['source_file'], 'fare:' + section['id'])
            fare_records.append(records[-1])
    directory = ROOT / 'data'
    (directory / 'pangasinan_fares.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in fare_records), encoding='utf-8')
    corpus = ''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in records)
    (directory / 'combined_training_data.jsonl').write_text(corpus, encoding='utf-8', newline='\n')
    (directory / 'pangasinan_phrasebook.jsonl').write_text(''.join(json.dumps(row, ensure_ascii=False) + '\n' for row in phrase_records), encoding='utf-8')
    (directory / 'provenance.json').write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (directory / 'knowledge_manifest.json').write_text(json.dumps({'sha256': hashlib.sha256(corpus.encode()).hexdigest(),
        'records': len(records), 'phrases': len(phrases), 'lgus': len(guides),
        'city_guides': len(guides),
        'fare_sections': len(reference['sections']),
        'lodging_properties': sum(len(lodging['hotels']) for lodging in lodging_guides),
        'sources': ['server/prisma/seedPhrasebookV2.ts', 'server/src/data/cityGuides.json', 'server/src/data/pangasinanFares.json', 'server/src/data/dagupanLodging.json', 'server/src/data/alaminosLodging.json', 'server/src/data/san-carlosLodging.json', 'server/src/data/urdanetaLodging.json']}, indent=2) + '\n', encoding='utf-8')
    print(f'Built {len(records)} records from {len(phrases)} V2 phrases and {len(guides)} selected guides.')


if __name__ == '__main__':
    main()
