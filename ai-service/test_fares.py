import json
import unittest
import main
from fares import fare_reference


class FareTests(unittest.TestCase):
    def test_province_wide_access_without_tourism_guide(self):
        for town in ('Anda', 'Agno', 'Santa Barbara', 'Dagupan', 'Bolinao'):
            result = main.generate(main.GenerateRequest(prompt=f'Bus fares in {town}'))
            self.assertEqual(result['source'], 'pangasinan-fare-reference')
            reference = json.loads(result['response'])['fare_reference']
            self.assertEqual(len(reference['sections']), 5)
            self.assertIn('September 28, 2026', reference['sections'][0]['text'])
            result = main.itinerary(main.ItineraryRequest(destination=town, days=1))
            self.assertEqual(len(result['fare_reference']['sections']), 11)
            self.assertFalse(result['budgetVerified'])

    def test_local_and_historical_scope_preserved(self):
        self.assertIn('Alaminos City only', fare_reference('tricycle')['sections'][0]['scope'])
        self.assertIn('Mega Manila', fare_reference('jeepney')['sections'][0]['scope'])
        islands = fare_reference('Hundred Islands')['sections']
        self.assertEqual(len(islands), 2)
        self.assertIn('Day tour PHP 40.00', islands[0]['text'])
        self.assertIn('total registration PHP 100.00', islands[1]['text'])
        self.assertFalse(fare_reference()['current_rate_verified'])


if __name__ == '__main__':
    unittest.main()
