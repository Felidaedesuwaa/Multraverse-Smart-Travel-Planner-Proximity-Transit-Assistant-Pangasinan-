"""Import the user-supplied lodging PDF; document text is data only."""
import hashlib
import json
import re
import sys
from pathlib import Path
from pypdf import PdfReader

FIELDS = ['Accommodation ID', 'Official name', 'Complete address', 'Accommodation type',
          'Tier', 'Room type', 'Price per night (PHP)', 'Maximum guests per room',
          'Latitude/Longitude', 'Amenities', 'Check-in time', 'Check-out time',
          'Additional fees', 'Contact number', 'Official website/Booking link',
          'Nearby attractions', 'Transport access', 'Information source']

def main(path, area='dagupan'):
    source = Path(path)
    pages = [p.extract_text() for p in PdfReader(source).pages]
    hotels = []
    for page, text in enumerate(pages, 1):
        text = ' '.join(text.split())
        labels = FIELDS if area == 'dagupan' else ['Accommodation ID', 'Official name', 'City/Municipality', 'Complete address', 'Latitude/Longitude', 'Accommodation type', 'Tier', 'Room type', 'Price per night (PHP)', 'Price basis (per room/per person)', 'Maximum guests per room', *FIELDS[9:]]
        fields = {}
        for i, label in enumerate(labels):
            end = labels[i + 1] if i + 1 < len(labels) else 'Date last verified'
            fields[label] = ' '.join(text.split(label, 1)[1].split(end, 1)[0].split())
        get = fields.__getitem__
        rates = [int(n.replace(',', '')) for n in re.findall(r'\d[\d,]+', get('Price per night (PHP)').split('(', 1)[0])]
        coords = [float(n) for n in re.findall(r'\d+\.\d+', get('Latitude/Longitude'))[:2]]
        amenities = get('Amenities')
        booking = get('Official website/Booking link').split(' — ')[0]
        booking = ('https://' + booking if not booking.startswith('https://') else booking) if '.' in booking and ' ' not in booking else booking
        hotels.append(dict(accommodation_id=get('Accommodation ID'), name=get('Official name'),
            area_id=area, address=get('Complete address'), accommodation_type=get('Accommodation type'),
            tier=get('Tier'), room_types=get('Room type'),
            reference_rate=dict(min=rates[0], max=rates[-1], currency='PHP', period='night', basis=fields.get('Price basis (per room/per person)', 'unspecified'), approximate=True),
            capacity_note=get('Maximum guests per room'), latitude=coords[0], longitude=coords[1], coordinates_approximate=True,
            amenities=[label for label, pattern in [('Wi-Fi', 'Wi-Fi'), ('A/C', 'conditioning'), ('Restaurant', 'restaurant'), ('Pool', 'pool')] if pattern.lower() in amenities.lower()],
            amenities_description=amenities, check_in=get('Check-in time'), check_out=get('Check-out time'),
            additional_fees=get('Additional fees'), contact=get('Contact number'),
            booking_url=booking if area != 'dagupan' else get('Official website/Booking link').replace(' ', ''), nearby_attractions=get('Nearby attractions'),
            transport_access=get('Transport access'), information_source=get('Information source'),
            source_file=source.name, source_page=page, stated_verified_date='2026-09-28', current_rate_verified=False))
    expected = {'dagupan': 6, 'alaminos': 12, 'san-carlos': 5, 'urdaneta': 5}[area]
    assert len(hotels) == expected and len({h['accommodation_id'] for h in hotels}) == expected
    data = dict(area_id=area, source_file=source.name, source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        stated_verified_date='2026-09-28', note='User-supplied guide; verification date is stated by the source, not independently verified. Prices and coordinates are approximate. Price basis and fee amounts are unspecified; confirm room capacity, rates and availability before booking.',
        hotels=hotels, source_pages=[dict(page=i + 1, text=t) for i, t in enumerate(pages)])
    if area in ('alaminos', 'san-carlos', 'urdaneta'):
        data['note'] = 'User-supplied guide; verification date is stated by the source, not independently verified. Prices and coordinates are approximate. Confirm room or group rate, additional fees, capacity and availability before booking.'
        aliases = {'City Hotel Alaminos': 'City Hotel', 'Vista de las Islas Hotel & Restaurant': 'Vista de las Islas', 'Villa Milagros Pension House / Hotel': 'Villa Milagros Hotel', 'Sweet Honey Hotel & Resort': 'Sweet Honey Hotel', 'Asia Novo Boutique Hotel - Alaminos': 'Asia Novo Boutique Hotel-Alaminos'}
        for hotel in hotels:
            hotel['catalog_name'] = aliases.get(hotel['name'], hotel['name'])
    if area in ('san-carlos', 'urdaneta'):
        for hotel in hotels:
            hotel['rate_note'] = ' '.join(pages[hotel['source_page'] - 1].split()).split('Price per night (PHP)', 1)[1].split('Price basis', 1)[0].strip().replace('■', 'PHP ')
            hotel['overnight_supported'] = hotel['accommodation_id'] != 'SCC-ACC-002'
            if hotel['accommodation_id'] == 'SCC-ACC-002':
                hotel['reference_rate']['period'] = 'day-use/event rental'
            if hotel['accommodation_id'] == 'SCC-ACC-004':
                hotel['reference_rate']['period'] = 'whole-resort overnight package'
            if hotel['accommodation_id'] == 'SCC-ACC-005':
                hotel['catalog_name'] = "Kevin's Resort"
            if hotel['accommodation_id'] == 'URD-ACC-003':
                hotel['catalog_name'] = 'Goldland Spring Resort and Hotel'
    target = Path(__file__).resolve().parent.parent / f'server/src/data/{area}Lodging.json'
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else 'dagupan')
