import json
import unittest
import db
from knowledge import ROOT, source_lodging_guides


class AlaminosLodgingTests(unittest.TestCase):
    def test_import_and_runtime(self):
        source = next(g for g in source_lodging_guides() if g['area_id'] == 'alaminos')
        hotels = source['hotels']
        self.assertEqual(len(hotels), 12)
        self.assertEqual(len({h['accommodation_id'] for h in hotels}), 12)
        self.assertEqual(hotels[0]['reference_rate']['min'], 4000)
        self.assertIn('breakfast', hotels[0]['reference_rate']['basis'])
        self.assertIn('group', hotels[9]['reference_rate']['basis'])
        self.assertEqual(hotels[1]['check_in'], '1:00 PM')
        self.assertEqual(hotels[3]['booking_url'], 'Local direct booking / City directory listing')
        self.assertFalse(any('google.com/search' in h['booking_url'] for h in hotels))
        self.assertEqual(hotels[0]['booking_url'], 'https://proxyplusalaminos.theorientalhotels.com')
        for query in ['Hotels in Alaminos', 'Como Laya Resort']:
            guide = json.loads(db.answer_knowledge(query))['city_guides'][0]
            self.assertEqual(guide['area_id'], 'alaminos')
            self.assertEqual(guide['hotels'], hotels)
        rows = [json.loads(line) for line in (ROOT / 'data/alaminos_lodging.jsonl').read_text(encoding='utf-8').splitlines()]
        self.assertEqual(len(rows), 12)
        self.assertTrue(all(source['source_file'] in row['response'] for row in rows))


if __name__ == '__main__':
    unittest.main()
