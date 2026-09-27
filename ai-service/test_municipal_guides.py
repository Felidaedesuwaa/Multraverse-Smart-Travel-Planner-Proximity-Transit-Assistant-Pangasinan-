"""Municipal PDFs share the LGU guide pipeline without changing source certainty."""
import json
import unittest
import db
import main
from knowledge import ROOT, source_city_guides


class MunicipalGuideTests(unittest.TestCase):
    def test_complete_sources_and_training(self):
        guides = {g['area_id']: g for g in source_city_guides()}
        provenance = json.loads((ROOT / 'data/provenance.json').read_text(encoding='utf-8'))
        for area, counts in [('bolinao', (9, 7, 5, 6, 12, 13)), ('manaoag', (9, 5, 6, 6, 10, 9)),
                             ('lingayen', (12, 6, 6, 5, 9, 9))]:
            with self.subTest(area=area):
                guide = guides[area]
                for field, count in zip(('attractions', 'hotels', 'local_foods', 'dining', 'activities', 'sample_itinerary'), counts):
                    self.assertEqual(len(guide[field]), count)
                self.assertEqual(len(guide['source_pages']), 7)
                self.assertEqual(guide['lgu_type'], 'Municipality')
                self.assertIsNone(guide['source_date'])
                self.assertEqual(guide['listings_checked_month'], '2026-09')
                self.assertEqual(guide['source_urls'], [])
                self.assertEqual(guide['source_url'], 'urn:sha256:' + guide['source_sha256'])
                self.assertFalse(guide['operating_details_verified'])
                self.assertTrue(any(p['group'] == guide['entity_id'] for p in provenance))
                self.assertFalse(any(p['group'].startswith('PANGASINAN-') and p['group'].endswith('-' + area.upper()) for p in provenance))
        self.assertIn('sticky rice', guides['bolinao']['local_foods'][0]['description'])
        self.assertEqual(guides['bolinao']['local_foods'][0]['source_pages'], [4, 5])
        self.assertIn('December', guides['manaoag']['festivals'])
        self.assertIn('March 18–20', guides['lingayen']['festivals'])
        self.assertIn('life jacket', guides['bolinao']['waterfall_details'])
        self.assertIn('potential farm-tourism', guides['manaoag']['attractions'][5]['description'])
        self.assertIn('exterior', guides['lingayen']['attractions'][3]['description'])

    def test_itinerary_selection_and_aliases(self):
        for name, count, first in [('Bolinao', 9, 'Patar White Sand Beach'),
                                   ('Manaoag', 9, 'Minor Basilica of Our Lady of the Rosary of Manaoag'),
                                   ('Lingayen', 12, 'Lingayen Town Plaza')]:
            with self.subTest(name=name):
                result = main.itinerary(main.ItineraryRequest(destination=name, days=3))
                stops = [s for day in result['days'] for s in day['stops']]
                self.assertEqual(len(stops), count)
                self.assertEqual(stops[0]['place'], first)
                self.assertTrue(all(s['source_file'] == name + '_Tourism_Guide.pdf' for s in stops))
                self.assertTrue(all(s['time'] is None and s['estimatedCost'] is None and s['snapshot_date'] is None for s in stops))
                self.assertFalse(result['budgetVerified'])
                self.assertTrue(result['city_guides'][0]['access_note'])
        self.assertEqual([g['name'] for g in db.get_city_guides('Patar Beach')], ['Bolinao'])
        result = json.loads(db.answer_knowledge('Lingayen and Manaoag'))
        self.assertEqual({g['name'] for g in result['city_guides']}, {'Lingayen', 'Manaoag'})


if __name__ == '__main__':
    unittest.main()
