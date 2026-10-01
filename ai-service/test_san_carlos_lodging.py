import json
import unittest
import db
from knowledge import ROOT, source_lodging_guides


class SanCarlosLodgingTests(unittest.TestCase):
    def test_source_and_special_rates(self):
        source = next(g for g in source_lodging_guides() if g['area_id'] == 'san-carlos')
        hotels = source['hotels']
        self.assertEqual(len(hotels), 5)
        self.assertEqual(len({h['accommodation_id'] for h in hotels}), 5)
        self.assertEqual(hotels[0]['reference_rate']['min'], 2950)
        self.assertFalse(hotels[1]['overnight_supported'])
        self.assertEqual(hotels[1]['reference_rate']['period'], 'day-use/event rental')
        self.assertIn('PHP 200/person', hotels[1]['rate_note'])
        self.assertEqual(hotels[3]['reference_rate']['min'], 25000)
        self.assertEqual(hotels[3]['reference_rate']['max'], 25000)
        self.assertIn('25 guests', hotels[3]['reference_rate']['basis'])
        self.assertIn('all 5 rooms', hotels[3]['capacity_note'])
        self.assertIn('3 hrs / 12 hrs / 24 hrs', hotels[2]['rate_note'])
        for query in ['Hotels in San Carlos', 'Kabaleyan Cove Resort']:
            guide = json.loads(db.answer_knowledge(query))['city_guides'][0]
            self.assertEqual(guide['area_id'], 'san-carlos')
            self.assertEqual(guide['hotels'], hotels)
        rows = (ROOT / 'data/san-carlos_lodging.jsonl').read_text(encoding='utf-8').splitlines()
        self.assertEqual(len(rows), 5)
        self.assertTrue(all('San Carlos City?' in json.loads(row)['instruction'] for row in rows))


if __name__ == '__main__':
    unittest.main()
