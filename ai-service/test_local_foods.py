import unittest
from local_foods import REFERENCE, source_foods, get_foods


class FoodTests(unittest.TestCase):
    def test_complete_reference(self):
        self.assertEqual(len(REFERENCE['foods']), 53)
        self.assertTrue(all(food['avgPrice'] is None and 2 <= food['source_page'] <= 6 for food in REFERENCE['foods']))

    def test_destination_associations(self):
        dagupan = {food['name'] for food in source_foods('Dagupan City')}
        self.assertIn('Bangus Sisig', dagupan)
        self.assertNotIn('Alaminos Longganisa', dagupan)
        self.assertNotIn('Lauya', dagupan)  # Province-wide association does not establish a city vendor.
        self.assertIn('Deremen', {food['name'] for food in source_foods('Santa Barbara')})
        self.assertEqual(source_foods('Unknown destination'), [])

    def test_database_publication_is_authoritative(self):
        class Collection:
            def find(self, query, projection):
                self.query = query
                return []
        class Database:
            localfoods = Collection()
        database = Database()
        self.assertEqual(get_foods('Dagupan', database), [])
        self.assertEqual(database.localfoods.query['approvalStatus'], 'approved')

    def test_database_failure_uses_reference(self):
        class Collection:
            def find(self, *args):
                raise ConnectionError()
        class Database:
            localfoods = Collection()
        self.assertTrue(get_foods('Calasiao', Database()))

    def test_food_question_and_itinerary(self):
        from unittest.mock import patch
        import main
        with patch('db.get_foods_by_destination', side_effect=source_foods):
            result = main.generate(main.GenerateRequest(prompt='What foods can I try in Calasiao?'))
        self.assertEqual(result['source'], 'local-food-reference')
        self.assertIn('Puto Calasiao', result['response'])
        with patch('main.get_foods_by_destination', side_effect=source_foods):
            plan = main.itinerary(main.ItineraryRequest(destination='Bolinao', budget='2000', days=1))
        self.assertIn('Binungey', {food['name'] for food in plan['local_foods']})


if __name__ == '__main__':
    unittest.main()
