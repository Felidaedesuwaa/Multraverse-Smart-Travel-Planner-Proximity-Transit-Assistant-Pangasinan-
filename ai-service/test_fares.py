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
            self.assertEqual(len(reference['sections']), 2)
            self.assertIn('September 28, 2026', reference['sections'][0]['text'])
            result = main.itinerary(main.ItineraryRequest(destination=town, days=1))
            self.assertEqual(len(result['fare_reference']['sections']), 4)
            self.assertFalse(result['budgetVerified'])

    def test_updated_matrix_scope_and_exact_rows(self):
        reference = fare_reference()
        self.assertEqual(reference['source_file'], 'Pangasinan_Fare_Reference_Updated_Tricycle (1).pdf')
        tricycle = fare_reference('tricycle')['sections'][0]
        self.assertIn('Dagupan City only', tricycle['scope'])
        self.assertEqual(tricycle['rows'][0], {'km': 1, 'regular': 20, 'discounted': 16})
        jeep = fare_reference('jeepney')['sections'][0]
        self.assertEqual(jeep['rows'][4]['discounted'], 12)
        self.assertEqual(len(jeep['rows']), 50)
        self.assertFalse(reference['current_rate_verified'])


if __name__ == '__main__':
    unittest.main()
