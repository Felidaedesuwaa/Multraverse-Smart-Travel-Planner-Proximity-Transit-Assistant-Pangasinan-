"""Offline regression checks for source isolation and honest missing data."""
import hashlib
import json
import unittest
from unittest.mock import patch
import db
import main
from knowledge import ROOT, source_phrases, source_city_guides


class KnowledgeTests(unittest.TestCase):
    def test_only_retained_training_sources(self):
        records = [json.loads(line) for line in (ROOT / 'data/combined_training_data.jsonl').read_text(encoding='utf-8').splitlines()]
        provenance = json.loads((ROOT / 'data/provenance.json').read_text(encoding='utf-8'))
        manifest = json.loads((ROOT / 'data/knowledge_manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(len(records), len(provenance))
        self.assertEqual(len(records), manifest['records'])
        self.assertEqual(manifest['sha256'], hashlib.sha256((ROOT / 'data/combined_training_data.jsonl').read_text(encoding='utf-8').encode('utf-8')).hexdigest())
        self.assertEqual({r['source'] for r in provenance}, {'server/prisma/seedPhrasebookV2.ts', 'Pangasinan_Fares_and_Hundred_Islands_Rates.pdf', *[g['source_file'] for g in source_city_guides()]})
        self.assertEqual(len({r['instruction'] for r in records}), len(records))

    def test_phrasebook_all_directions_and_unknown(self):
        self.assertEqual(len(source_phrases()), 95)
        for row in source_phrases():
            for origin in ('English', 'Filipino', 'Pangasinan'):
                for target in ('English', 'Filipino', 'Pangasinan'):
                    self.assertEqual(db.get_phrasebook(origin, target, row[origin.lower()]), row[target.lower()])
        with self.assertRaises(main.HTTPException) as error:
            main.translate(main.TranslateRequest(text='not a retained phrase', from_lang='English', to_lang='Pangasinan'))
        self.assertEqual(error.exception.status_code, 404)

    def test_no_unrelated_destination_fallback(self):
        self.assertEqual(db.get_places_by_destination('Unknown destination'), [])
        self.assertEqual(db.get_places_by_destination('Santa Barbara'), [])
        self.assertTrue(db.get_places_by_destination('Hundred Islands'))

    def test_removed_source_has_no_fallback(self):
        for prompt in ('Where can I stay in Agno?', 'What travel updates are available?'):
            result = main.generate(main.GenerateRequest(prompt=prompt))
            self.assertEqual(result['source'], 'unsupported-destination')
            self.assertNotIn('province_wide', result['response'])
        self.assertEqual({g['area_id'] for g in source_city_guides()},
                         {'dagupan', 'alaminos', 'urdaneta', 'san-carlos', 'lingayen', 'manaoag', 'bolinao'})

    def test_itinerary_ignores_injected_legacy_prices(self):
        result = main.itinerary(main.ItineraryRequest(destination='Bolinao', days=1,
            places=[{'name': 'Patar Beach', 'entryFee': 999}, {'name': 'Invented attraction'}],
            routes=[{'price': 999}]))
        stops = result['days'][0]['stops']
        self.assertEqual([s['place'] for s in stops], ['Patar White Sand Beach'])
        self.assertIsNone(stops[0]['estimatedCost'])
        self.assertIsNone(stops[0]['time'])
        self.assertFalse(result['budgetVerified'])

    def test_database_failure_retains_complete_local_sources(self):
        with patch.dict('os.environ', {'MONGODB_URI': 'mongodb://fixture'}), patch.object(db, 'MongoClient', side_effect=RuntimeError('offline')):
            counts = db.load_knowledge()
        self.assertEqual(counts['phrases'], 95)
        self.assertEqual(counts['lgus'], 7)
        self.assertEqual(counts['source'], 'local-sources')


if __name__ == '__main__':
    unittest.main()
