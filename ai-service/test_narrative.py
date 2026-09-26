"""Contract tests use a fake generator; they do not load/download any model."""
import unittest
from unittest.mock import patch

import main


class NarrativeTests(unittest.TestCase):
    def request(self):
        return main.NarrativeRequest(days=[main.NarrativeDay(day=1, stops=[main.NarrativeStop(
            placeId='000000000000000000000001', name='Fixture place',
            facts='Enjoy the listed garden. Bring your own water.'
        )])])

    def test_extracts_only_source_text_and_preserves_ids(self):
        with patch.object(main, '_generate_response', return_value='Enjoy the listed garden.'):
            result = main.narrate(self.request())
        self.assertEqual(result['days'][0]['stops'], [{'placeId': '000000000000000000000001', 'text': 'Enjoy the listed garden.'}])

    def test_rejects_invented_fares(self):
        with patch.object(main, '_generate_response', return_value='Take a bus for 25 pesos.'):
            self.assertEqual(main.narrate(self.request())['days'][0]['stops'], [])

    def test_empty_approved_snapshot_does_not_use_cached_content(self):
        request = main.ItineraryRequest(destination='Dagupan', budget='1000', days=1, places=[], routes=[], foods=[])
        with patch.object(main, 'get_places_by_destination', return_value=[{'name': 'Hidden place'}]), patch.object(main, 'get_routes_by_destination', return_value=[{'from': 'Hidden route'}]), patch.object(main, 'get_local_foods', return_value=[{'name': 'Hidden food'}]), patch.object(main, 'generate_response', return_value='{"days": []}') as generate:
            main.itinerary(request)
        self.assertNotIn('Hidden', generate.call_args.args[0])

    def test_busy_does_not_queue_inference(self):
        main.GENERATION_LOCK.acquire()
        try:
            with self.assertRaises(main.HTTPException) as error:
                main.narrate(self.request())
            self.assertEqual(error.exception.status_code, 503)
        finally:
            main.GENERATION_LOCK.release()

    def test_missing_adapter_releases_lock(self):
        with patch.object(main, '_generate_response', side_effect=main.ModelUnavailableError('missing')):
            with self.assertRaises(main.HTTPException) as error:
                main.narrate(self.request())
            self.assertEqual(error.exception.status_code, 503)
        self.assertFalse(main.GENERATION_LOCK.locked())


if __name__ == '__main__':
    unittest.main()
