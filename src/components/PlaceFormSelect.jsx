import { useState } from 'react'
import { TextInput, View } from 'react-native'
import SuperAdminSelect from './SuperAdminSelect'
import { useAppTheme } from '../theme/useAppTheme'

const categories = ['Nature Park', 'Beach', 'Religious', 'Restaurant', 'Landmark', 'Waterway', 'Museum', 'Adventure', 'Other']
const hours = ['Open 24 hours', '8:00 AM - 5:00 PM', '9:00 AM - 6:00 PM', '6:00 AM - 6:00 PM', 'By appointment']
export default function PlaceFormSelect({ field, label, value, onChange, disabled, resource = 'places' }) {
  const { palette: p } = useAppTheme()
  const transit = resource === 'transit-routes'
  const food = resource === 'foods'
  const route = resource === 'route-prices'
  const price = ['entryFee', 'avgPrice', 'price'].includes(field)
  const values = transit ? field === 'status' ? ['ACTIVE', 'INACTIVE'] : field === 'type' ? ['BUS', 'JEEPNEY', 'TRICYCLE', 'VAN'] : field === 'frequency' ? ['Every 5 minutes', 'Every 10 minutes', 'Every 15 minutes', 'Every 20 minutes', 'Every 30 minutes', 'Every hour', 'Every 2 hours', 'On demand'] : ['0', '1', '2', '3', '4', '5', '10', '15', '20'] : route ? field === 'vehicle' ? ['Bus', 'Jeepney', 'Tricycle', 'Van', 'E-jeepney', 'Ferry'] : field === 'duration' ? ['5 min', '10 min', '15 min', '20 min', '30 min', '45 min', '1 hour', '1 hour 30 min', '2 hours', '3 hours', '4 hours'] : ['15', '20', '25', '30', '50', '75', '100', '150', '200', '300', '500', '1000'] : food ? field === 'category' ? ['Main dish', 'Seafood', 'Street food', 'Snack', 'Dessert', 'Beverage', 'Pasalubong'] : field === 'where' ? ['Public market', 'Local restaurants', 'Food stalls', 'Pasalubong shops', 'Cafes and bakeries'] : ['25', '50', '75', '100', '150', '200', '300', '500', '1000'] : field === 'category' ? categories : field === 'openHours' ? hours : ['0', '50', '100', '150', '200', '300', '500', '1000']
  const [custom, setCustom] = useState(!!value && !values.includes(String(value)))
  const allowCustom = !transit || !['type', 'status'].includes(field)
  const options = values.map(item => ({ value: item, label: price ? item === '0' ? 'Free entry (PHP 0)' : `PHP ${item}` : item }))
  return <View style={{ gap: 10 }}>
    <SuperAdminSelect hideLabel label={label} placeholder={`Select ${label.toLowerCase()}`} disabled={disabled} value={custom ? '__custom__' : String(value ?? '')} options={[{ value: '', label: food || route || transit ? `Select ${label.toLowerCase()}` : field === 'category' ? 'Select category' : 'Not specified' }, ...options, ...(allowCustom ? [{ value: '__custom__', label: 'Other (specify)' }] : [])]} onChange={next => { setCustom(next === '__custom__'); onChange(next === '__custom__' ? '' : next) }} />
    {custom && <TextInput accessibilityLabel={`Custom ${label}`} value={String(value ?? '')} onChangeText={onChange} editable={!disabled} keyboardType={price ? 'decimal-pad' : field === 'stops' ? 'number-pad' : 'default'} maxLength={price ? 12 : field === 'where' ? 300 : 120} placeholder={transit ? field === 'stops' ? 'e.g. 7' : 'e.g. Every 45 minutes' : price ? 'e.g. 75.50' : route ? field === 'duration' ? 'e.g. 1 hour 15 min' : 'e.g. Minibus' : field === 'openHours' ? 'e.g. Mon-Sat, 7:00 AM - 8:00 PM' : food ? field === 'where' ? 'e.g. Stall name, street, barangay' : 'e.g. Traditional delicacy' : 'e.g. Heritage site'} placeholderTextColor={p.muted} style={{ borderWidth: 1, borderColor: p.line, backgroundColor: p.background, color: p.ink, padding: 13, minHeight: 48, borderRadius: 10 }} />}
  </View>
}
