import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import AdminPage from '../components/AdminPage'
import Card from '../components/Card'
import SuperAdminSelect from '../components/SuperAdminSelect'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'
const actions = ['create_lgu_account', 'create_admin_account', ...['place', 'geofence', 'local_food', 'route_price', 'transit_route'].flatMap(type => [`approve_${type}`, `reject_${type}`])]
export default function SuperAdminAuditLog() {
  const { text } = useAppTheme()
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setData(null); setError('')
    api.getAuditLogs({ page, action }).then(result => { if (active) setData(result) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [page, action, refresh])
  return <AdminPage title="Audit Log" subtitle="Account creation and LGU content review history">
    <View style={{ gap: 16 }}>
      <SuperAdminSelect label="Action" value={action} onChange={value => { setAction(value); setPage(1) }} options={[{ value: '', label: 'All actions' }, ...actions.map(value => ({ value, label: value.replaceAll('_', ' ') }))]} />
      <Pressable accessibilityRole="button" onPress={() => setRefresh(value => value + 1)}><Text style={{ color: text }}>Refresh log</Text></Pressable>
      {error ? <Text accessibilityRole="alert" style={{ color: text }}>{error}</Text> : !data ? <ActivityIndicator /> : <Card style={{ gap: 16 }}>
        <ScrollView horizontal><View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row' }}>{['Actor', 'Action', 'Target', 'Municipality', 'Timestamp'].map(label => <Text key={label} style={{ color: text, width: 220, fontWeight: 'bold' }}>{label}</Text>)}</View>
          {data.items.map(row => <View key={row.id} style={{ flexDirection: 'row' }}>
            {[row.actor?.email || 'Deleted account', `${row.action.replaceAll('_', ' ')}${row.metadata?.deletion ? ' (deletion)' : ''}`, row.targetUser?.email || row.metadata?.itemId || 'Unavailable', row.metadata?.municipality || '-', new Date(row.createdAt).toLocaleString()].map((value, index) => <Text key={index} selectable style={{ color: text, width: 220 }}>{value}</Text>)}
          </View>)}
          {!data.items.length && <Text style={{ color: text }}>No matching events.</Text>}
        </View></ScrollView>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <Pressable accessibilityRole="button" disabled={page <= 1} onPress={() => setPage(value => value - 1)}><Text style={{ color: text, opacity: page <= 1 ? 0.4 : 1 }}>Previous</Text></Pressable>
          <Text style={{ color: text }}>Page {page} / {Math.max(1, data.totalPages)} ({data.total} events)</Text>
          <Pressable accessibilityRole="button" disabled={page >= data.totalPages} onPress={() => setPage(value => value + 1)}><Text style={{ color: text, opacity: page >= data.totalPages ? 0.4 : 1 }}>Next</Text></Pressable>
        </View>
      </Card>}
    </View>
  </AdminPage>
}
