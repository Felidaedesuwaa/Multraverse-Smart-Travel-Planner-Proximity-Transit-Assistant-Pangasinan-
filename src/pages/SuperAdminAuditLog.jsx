import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import { RefreshCw } from 'lucide-react-native'
import { WorkspaceButton, WorkspacePage, WorkspacePanel, WorkspaceTable, ui } from '../components/SuperAdminWorkspace'
import SuperAdminSelect from '../components/SuperAdminSelect'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'
const actions = [...['create', 'update', 'delete'].flatMap(action => [action + '_lgu_account', action + '_admin_account']), ...['place', 'geofence', 'local_food', 'route_price', 'transit_route'].flatMap(type => [`approve_${type}`, `reject_${type}`])]
const actionLabel = value => value.replaceAll('_', ' ').replace(/^./, character => character.toUpperCase())
export default function SuperAdminAuditLog({ navigation }) {
  const { palette: p } = useAppTheme()
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => navigation.addListener('focus', () => setRefresh(value => value + 1)), [navigation])
  useEffect(() => {
    let active = true
    setData(null); setError('')
    api.getAuditLogs({ page, action }).then(result => { if (active) setData(result) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [page, action, refresh])
  const loading = !data && !error
  return <WorkspacePage title="Audit Log" subtitle="Trace account creation and content review activity across the platform." actions={<WorkspaceButton label="Refresh" icon={RefreshCw} loading={loading} onPress={() => setRefresh(value => value + 1)} />}>
    <WorkspacePanel>
      <View style={ui.toolbar}><View style={{ gap: 4 }}><Text style={[ui.heading, { color: p.ink }]}>Activity history</Text><Text style={[ui.caption, { color: p.muted }]}>{data ? `${data.total} matching events` : 'Account and LGU content review records'}</Text></View><View style={{ width: 300, maxWidth: '100%' }}><SuperAdminSelect label="Filter by action" value={action} onChange={value => { if (value !== action) { setData(null); setAction(value); setPage(1) } }} options={[{ value: '', label: 'All actions' }, ...actions.map(value => ({ value, label: actionLabel(value) }))]} /></View></View>
      {error ? <Text accessibilityRole="alert" style={[ui.body, { color: p.accent }]}>{error}</Text> : !data ? <View style={ui.empty}><ActivityIndicator color={p.ink} /><Text style={[ui.caption, { color: p.muted }]}>Loading activity...</Text></View> : <>
        <WorkspaceTable columnWidths={[200, 180, 200, 180]} columns={['Actor', 'Action', 'Target', 'Timestamp']} rows={data.items.map(row => ({ id: row.id, cells: [row.actor?.email || 'Deleted account', `${actionLabel(row.action)}${row.metadata?.deletion ? ' (deletion)' : ''}`, row.targetUser?.email || row.metadata?.email || row.metadata?.itemId || 'Unavailable', new Date(row.createdAt).toLocaleString()] }))} empty="No events match this filter." />
        <View style={ui.toolbar}><Text style={[ui.caption, { color: p.muted }]}>Page {page} of {Math.max(1, data.totalPages)} ({data.total} events)</Text><View style={{ flexDirection: 'row', gap: 10 }}><WorkspaceButton label="Previous" disabled={page <= 1} onPress={() => { setData(null); setPage(value => value - 1) }} /><WorkspaceButton label="Next" disabled={page >= data.totalPages} onPress={() => { setData(null); setPage(value => value + 1) }} /></View></View>
      </>}
    </WorkspacePanel>
  </WorkspacePage>
}
