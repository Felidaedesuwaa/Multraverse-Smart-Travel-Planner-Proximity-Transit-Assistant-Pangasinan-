import json
import unittest
import db
from knowledge import ROOT, source_city_guides, source_dagupan_lodging


class DagupanLodgingTests(unittest.TestCase):
    def test_source_and_area_isolation(self):
        data = source_dagupan_lodging()
        self.assertEqual(len(data['hotels']), 6)
        self.assertEqual(len({h['accommodation_id'] for h in data['hotels']}), 6)
        original = json.loads((ROOT.parent / 'server/src/data/cityGuides.json').read_text(encoding='utf-8'))
        for guide, before in zip(source_city_guides(), original):
            if guide['area_id'] not in ('dagupan', 'alaminos', 'san-carlos', 'urdaneta'):
                self.assertEqual(guide, before)
        star = data['hotels'][0]
        self.assertEqual((star['reference_rate']['min'], star['reference_rate']['max']), (2500, 4500))
        self.assertFalse(star['current_rate_verified'])
        self.assertEqual(star['reference_rate']['basis'], 'unspecified')
        self.assertEqual(data['hotels'][4]['check_out'], '12:30 PM')
        self.assertNotIn(' ', data['hotels'][5]['booking_url'])

    def test_runtime_knowledge_by_city_and_hotel(self):
        for query in ['Hotels in Dagupan', 'Star Plaza Hotel']:
            guide = json.loads(db.answer_knowledge(query))['city_guides'][0]
            self.assertEqual(guide['area_id'], 'dagupan')
            self.assertEqual(guide['hotels'][0]['accommodation_id'], 'DAG-ACC-001')
            self.assertIn('not independently verified', guide['lodging_source_note'])


if __name__ == '__main__':
    unittest.main()
