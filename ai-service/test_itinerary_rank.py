import unittest
from unittest.mock import patch
import main


class RankingTests(unittest.TestCase):
    def request(self):
        return main.RankItineraryRequest(areaId='bolinao', tripTypes=['Nature'], activities=['Outdoor Exploration'], travelStyle='relaxed',
            candidates=[main.RankCandidate(id=str(i).zfill(24), name=f'Catalog option {i}', category='Nature') for i in range(2)])

    def test_selects_only_supplied_ids(self):
        with patch.object(main, 'generate_response', return_value='[1,0]'):
            self.assertEqual(main.rank_itinerary(self.request())['ids'], [str(1).zfill(24), str(0).zfill(24)])

    def test_budget_and_food_rules_reach_model(self):
        request = self.request()
        request.budget = 5000
        request.visitAllowance = 700
        request.mealBudget = 250
        request.tripTypes = ['Food Trip']
        with patch.object(main, 'generate_response', return_value='[0,1]') as generate:
            main.rank_itinerary(request)
            prompt = generate.call_args.args[0]
            self.assertIn('remaining visits PHP 700', prompt)
            self.assertIn('meals PHP 250/person/day', prompt)
            self.assertIn('every supplied local food', prompt)
            self.assertIn('unconfirmed, not free', prompt)

    def test_rejects_invented_duplicate_missing_and_boolean_indices(self):
        for result in ['[0,2]', '[0,0]', '[0]', '[false,1]', '{"hotel":"Invented Hotel"}']:
            with self.subTest(result=result), patch.object(main, 'generate_response', return_value=result):
                with self.assertRaises(main.HTTPException):
                    main.rank_itinerary(self.request())


if __name__ == '__main__':
    unittest.main()
