import json
import unittest
import db
from knowledge import ROOT, source_lodging_guides


class UrdanetaLodgingTests(unittest.TestCase):
    def test_import_and_runtime(self):
        source = next(g for g in source_lodging_guides() if g['area_id'] == 'urdaneta')
        hotels = source['hotels']
        self.assertEqual(len(hotels), 5)
        self.assertEqual(len({h['accommodation_id'] for h in hotels}), 5)
        self.assertEqual(hotels[0]['reference_rate']['min'], 2800)
        self.assertEqual(hotels[0]['reference_rate']['max'], 5500)
        self.assertIn('swimming pool access', hotels[1]['reference_rate']['basis'])
        self.assertEqual(hotels[2]['catalog_name'], 'Goldland Spring Resort and Hotel')
        self.assertIn('complimentary local breakfast', hotels[3]['reference_rate']['basis'])
        self.assertIn('in public areas', hotels[3]['amenities_description'])
        self.assertIn('day-use rates available', hotels[4]['rate_note'])
        self.assertTrue(hotels[4]['overnight_supported'])
        self.assertIn('cottage', hotels[4]['reference_rate']['basis'])
        self.assertTrue(all(not h['current_rate_verified'] for h in hotels))
        for query in ['Hotels in Urdaneta', 'Levo Hotel']:
            guide = json.loads(db.answer_knowledge(query))['city_guides'][0]
            self.assertEqual(guide['area_id'], 'urdaneta')
            self.assertEqual(guide['hotels'], hotels)
        rows = (ROOT / 'data/urdaneta_lodging.jsonl').read_text(encoding='utf-8').splitlines()
        self.assertEqual(len(rows), 5)
        self.assertTrue(all(source['source_file'] in json.loads(row)['response'] for row in rows))


if __name__ == '__main__':
    unittest.main()
