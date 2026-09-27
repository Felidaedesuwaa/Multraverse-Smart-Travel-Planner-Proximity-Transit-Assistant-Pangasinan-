"""Dagupan overrides only Dagupan and keeps unknown operational facts unknown."""
import json
import unittest
import db
import main
from knowledge import source_city_guides, ROOT


class CityGuideTests(unittest.TestCase):
    def test_san_carlos_source_and_city_selection(self):
        guide = next(g for g in source_city_guides() if g['area_id'] == 'san-carlos')
        self.assertIsNone(guide['source_date'])
        for field, count in [('source_pages', 5), ('attractions', 9), ('hotels', 5), ('local_foods', 6),
                             ('dining', 5), ('activities', 9), ('sample_itinerary', 6)]:
            self.assertEqual(len(guide[field]), count)
        self.assertEqual(guide['local_foods'][-1]['source_page'], 4)
        mango = next(a for a in guide['activities'] if a['name'] == 'Mango food trip')
        self.assertEqual(mango['source_pages'], [2, 3])
        self.assertIn('During mango season', mango['description'])
        self.assertIn('Exact dates and activities can change', guide['festivals'])
        for destination in ('San Carlos', 'San Carlos City', 'City of San Carlos', 'Minor Basilica of St. Dominic'):
            result = main.itinerary(main.ItineraryRequest(destination=destination, days=3))
            stops = [s for day in result['days'] for s in day['stops']]
            self.assertEqual(len(stops), 9)
            self.assertEqual(stops[0]['place'], 'City Plaza')
            self.assertTrue(all(s['source_file'] == guide['source_file'] and s['estimatedCost'] is None and s['snapshot_date'] is None for s in stops))
            self.assertIn('permission', result['city_guides'][0]['access_note'])
        self.assertEqual([g['area_id'] for g in db.get_city_guides('Dagupan City Museum & City Plaza')], ['dagupan'])
        self.assertEqual([g['area_id'] for g in db.get_city_guides('Urdaneta Oltama Rolling Hills')], ['urdaneta'])
        provenance = json.loads((ROOT / 'data/provenance.json').read_text(encoding='utf-8'))
        self.assertTrue(any(r['group'] == 'CITY-GUIDE-SAN-CARLOS' for r in provenance))
        self.assertFalse(any(r['group'] == 'PANGASINAN-D3-SAN-CARLOS-CITY' for r in provenance))

    def test_urdaneta_source_and_itinerary(self):
        guide = next(g for g in source_city_guides() if g['area_id'] == 'urdaneta')
        self.assertIsNone(guide['source_date'])
        for field, count in [('source_pages', 5), ('attractions', 11), ('hotels', 5), ('local_foods', 10),
                             ('dining', 5), ('activities', 8), ('sample_itinerary', 6)]:
            self.assertEqual(len(guide[field]), count)
        self.assertIn('permission', guide['access_note'])
        self.assertIn('Event dates can change', guide['festivals'])
        for destination in ('Urdaneta', 'Urdaneta City', 'City of Urdaneta', 'Museo de Urdaneta'):
            result = main.itinerary(main.ItineraryRequest(destination=destination, days=3))
            self.assertEqual(result['source'], 'city-tourism-guide')
            stops = [s for day in result['days'] for s in day['stops']]
            self.assertEqual(len(stops), 11)
            self.assertEqual(stops[0]['place'], 'Urdaneta City Public Market')
            self.assertTrue(all(s['source_file'] == guide['source_file'] and s['estimatedCost'] is None and s['snapshot_date'] is None for s in stops))
            self.assertIn('permission', result['city_guides'][0]['access_note'])
        provenance = json.loads((ROOT / 'data/provenance.json').read_text(encoding='utf-8'))
        self.assertTrue(any(r['group'] == 'CITY-GUIDE-URDANETA' for r in provenance))
        self.assertFalse(any(r['group'] == 'PANGASINAN-D5-URDANETA-CITY' for r in provenance))

    def test_source_coverage_and_provenance(self):
        guide = next(g for g in source_city_guides() if g['area_id'] == 'dagupan')
        self.assertEqual(guide['area_id'], 'dagupan')
        self.assertIsNone(guide['source_date'])
        self.assertEqual(len(guide['source_pages']), 4)
        for field, count in [('attractions', 9), ('hotels', 6), ('local_foods', 6), ('dining', 5), ('sample_itinerary', 5)]:
            self.assertEqual(len(guide[field]), count)
        self.assertFalse(guide['operating_details_verified'])

    def test_city_selection_aliases_and_plan(self):
        for destination in ('Dagupan', 'Dagupan City', 'City of Dagupan', 'Dawel River Cruise'):
            result = main.itinerary(main.ItineraryRequest(destination=destination, days=1))
            self.assertEqual(result['source'], 'city-tourism-guide')
            stops = result['days'][0]['stops']
            self.assertEqual([s['place'] for s in stops], [
                'Dagupan City Museum & City Plaza', 'Old St. John Cathedral / St. John the Evangelist',
                'Dawel River Cruise', 'Tondaligan Beach / Tondaligan People’s Park'])
            for stop in stops:
                self.assertIsNone(stop['estimatedCost'])
                self.assertIsNone(stop['time'])
                self.assertIsNone(stop['snapshot_date'])
                self.assertEqual(stop['source_file'], 'Dagupan_City_Tourism_Guide.pdf')
                self.assertTrue(stop['activity'])

    def test_other_lgus_and_mixed_destinations(self):
        places = db.get_places_by_destination('Anda')
        self.assertEqual(places, [])
        self.assertFalse(db.get_city_guides('Anda'))
        response = json.loads(db.answer_knowledge('Dagupan and Anda'))
        self.assertEqual(response['city_guides'][0]['area_id'], 'dagupan')
        self.assertEqual(set(response), {'city_guides'})
        self.assertEqual(len(response['city_guides']), 1)

    def test_training_uses_preferred_city_source(self):
        provenance = json.loads((ROOT / 'data/provenance.json').read_text(encoding='utf-8'))
        self.assertTrue(any(row['group'] == 'CITY-GUIDE-DAGUPAN' for row in provenance))
        self.assertFalse(any(row['group'] == 'PANGASINAN-D4-DAGUPAN-CITY' for row in provenance))
        rows = [json.loads(line) for line in (ROOT / 'data/dagupan_city_guide.jsonl').read_text(encoding='utf-8').splitlines()]
        self.assertTrue(any('Kaleskes' in row['response'] for row in rows))
        self.assertTrue(any('Bangus Festival' in row['response'] for row in rows))

    def test_alaminos_coverage_and_historical_rates(self):
        guide = next(g for g in source_city_guides() if g['area_id'] == 'alaminos')
        self.assertEqual(guide['source_date'], '2026-09')
        self.assertEqual(len(guide['source_pages']), 6)
        for field, count in [('attractions', 8), ('hotels', 12), ('local_foods', 4), ('dining', 11),
                             ('activities', 10), ('boat_rentals', 3), ('activity_rates', 9), ('sample_itinerary', 7)]:
            self.assertEqual(len(guide[field]), count)
        self.assertEqual([r['one_day_rate'] for r in guide['boat_rentals']], [1400, 1800, 2000])
        self.assertEqual([r['two_day_rate'] for r in guide['boat_rentals']], [3000, 3800, 4500])
        self.assertEqual([r['amount'] for r in guide['activity_rates']], [250, 100, 50, 50, 175, 1500, 400, 250, 250])
        for rate in guide['boat_rentals'] + guide['activity_rates']:
            self.assertTrue(rate['reference_only'])
            self.assertFalse(rate['current_rate_verified'])
            self.assertIn('not guaranteed 2026', rate['warning'])
        self.assertEqual(guide['sample_itinerary'][-1]['source_page'], 5)

    def test_alaminos_itinerary_prefers_city_guide_without_pricing_old_rates(self):
        for destination in ('Alaminos', 'Alaminos City', 'City of Alaminos', 'Hundred Islands', 'Lucap Wharf'):
            result = main.itinerary(main.ItineraryRequest(destination=destination, days=2))
            self.assertEqual(result['source'], 'city-tourism-guide')
            stops = [stop for day in result['days'] for stop in day['stops']]
            self.assertEqual(len(stops), 8)
            self.assertEqual(stops[0]['place'], 'Lucap Wharf & Lucap Baywalk')
            self.assertTrue(all(s['source_file'] == 'Alaminos_City_Tourism_Guide.pdf' for s in stops))
            self.assertTrue(all(s['estimatedCost'] is None for s in stops))
            self.assertFalse(result['budgetVerified'])
            self.assertEqual(len(result['city_guides'][0]['boat_rentals']), 3)
        provenance = json.loads((ROOT / 'data/provenance.json').read_text(encoding='utf-8'))
        self.assertTrue(any(r['group'] == 'CITY-GUIDE-ALAMINOS' for r in provenance))
        self.assertFalse(any(r['group'] == 'PANGASINAN-D1-ALAMINOS-CITY' for r in provenance))


if __name__ == '__main__':
    unittest.main()
