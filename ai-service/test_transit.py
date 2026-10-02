import unittest
from transit import TransitSearch, search_transit

class TransitTests(unittest.TestCase):
    def test_direction_and_order(self):
        def route(id, start, end, intermediate=False):
            stops = [{'name': start, 'areaId': start, 'lat': 16, 'lng': 120}]
            if intermediate:
                stops.append({'name': 'Binmaley', 'areaId': 'binmaley', 'lat': 16, 'lng': 120})
            stops.append({'name': end, 'areaId': end, 'lat': 16, 'lng': 120})
            return {'id': id, 'stops': stops}
        request = TransitSearch(from_area='dagupan', to_area='alaminos', candidates=[
            route('long', 'dagupan', 'alaminos', True),
            route('reverse', 'alaminos', 'dagupan'),
            route('direct', 'dagupan', 'alaminos')])
        self.assertEqual(search_transit(request)['route_ids'], ['direct', 'long'])

    def test_no_invented_route(self):
        self.assertEqual(search_transit(TransitSearch(from_area='dagupan', to_area='alaminos', candidates=[])), {'route_ids': []})

if __name__ == '__main__':
    unittest.main()
