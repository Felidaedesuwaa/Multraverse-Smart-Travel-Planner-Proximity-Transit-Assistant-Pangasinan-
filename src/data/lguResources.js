// Field definitions shared by the municipal editor and Admin review queue.
export const lguResources = {
  places: { label: 'Places', fields: [
    ['name', 'Name', 'required'], ['description', 'Description', 'required'], ['location', 'Address / location', 'required'],
    ['category', 'Category', 'required'], ['entryFee', 'Entry fee (PHP)', 'number'], ['openHours', 'Opening hours'], ['tips', 'Visitor tips'], ['sourceUrl', 'Source URL'],
  ] },
  foods: { label: 'Local food', fields: [
    ['name', 'Name', 'required'], ['description', 'Description', 'required'], ['avgPrice', 'Average price (PHP)', 'required-number'], ['where', 'Where to find it', 'required'], ['category', 'Category', 'required'],
  ] },
  'route-prices': { label: 'Route prices', fields: [
    ['from', 'Origin', 'required'], ['to', 'Destination', 'required'], ['vehicle', 'Vehicle', 'required'], ['price', 'Fare (PHP)', 'required-number'], ['duration', 'Duration (e.g. 30 min)', 'required'], ['notes', 'Notes'],
  ] },
  geofences: { label: 'Geofences', fields: [
    ['location', 'Location', 'required'], ['zone', 'Zone', 'required'], ['radius', 'Radius (e.g. 200 m)', 'required'], ['coord', 'Coordinates'], ['advisory', 'Advisory'], ['active', 'Active', 'boolean'],
  ] },
  'transit-routes': { label: 'Transit routes', fields: [
    ['name', 'Name', 'required'], ['type', 'Vehicle type', 'choice', ['BUS', 'JEEPNEY', 'TRICYCLE', 'VAN']], ['frequency', 'Frequency', 'required'], ['stops', 'Number of stops', 'number'], ['status', 'Service status', 'choice', ['ACTIVE', 'INACTIVE']],
  ] },
}
