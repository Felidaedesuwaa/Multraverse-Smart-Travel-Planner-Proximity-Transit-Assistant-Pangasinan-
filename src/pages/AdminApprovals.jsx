import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import AdminPage from '../components/AdminPage'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import GradientButton from '../components/GradientButton'
import { api } from '../lib/api'
import { lguResources } from '../data/lguResources'
import { useAppTheme } from '../theme/useAppTheme'

export default function AdminApprovals() {
  const { text: textColor, surface } = useAppTheme()
  const [resource, setResource] = useState('places')
  return <AdminPage title="LGU approvals" subtitle="Review municipal submissions before publishing to Explorers">
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>{Object.entries(lguResources).map(([key, value]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: resource === key }} onPress={() => setResource(key)} style={{ padding: 12, backgroundColor: surface, borderWidth: resource === key ? 2 : 0, borderColor: textColor, borderRadius: 10 }}><Text style={{ color: textColor }}>{value.label}</Text></Pressable>)}</View>
    <ApprovalQueue key={resource} resource={resource} />
  </AdminPage>
}
function ApprovalQueue({ resource }) {
  const { text: textColor, surface } = useAppTheme()
  const [rows, setRows] = useState([])
  const [reasons, setReasons] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const refresh = useCallback(async () => {
    setLoading(true)
    try { setRows(await api.getApprovals(resource)) } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [resource])
  useEffect(() => { refresh() }, [refresh])
  const review = async (row, decision) => {
    setBusy(true); setError('')
    try { await api.reviewSubmission(resource, row.id, decision, reasons[row.id], row.reviewRevision); await refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <View style={{ gap: 16 }}>
    <Pressable accessibilityRole="button" onPress={refresh}><Text style={{ color: textColor }}>Refresh queue</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: textColor }}>{error}</Text> : null}
    {loading ? <ActivityIndicator /> : rows.map(row => <Card key={row.id} style={{ gap: 12 }}>
      <Text style={{ color: textColor, fontSize: 18 }}>{row.name || row.location || `${row.from} ? ${row.to}`} ? {row.municipality}</Text>
      <StatusBadge status={row.approvalStatus} />
      {row.pendingDeletion ? <Text style={{ color: textColor }}>Deletion request ? approving permanently deletes this entry.</Text> : null}
      {Object.entries(row).filter(([key]) => !['id', '_id', '__v', 'submittedBy', 'reviewedBy', 'reviewRevision', 'pendingDeletion', 'approvalStatus', 'municipality'].includes(key)).map(([key, value]) => <Text key={key} style={{ color: textColor }}>{lguResources[resource].fields.find(([field]) => field === key)?.[1] || key.replace(/([A-Z])/g, ' $1')}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}</Text>)}
      <TextInput accessibilityLabel="Rejection reason" placeholder="Reason required for rejection" placeholderTextColor={textColor} value={reasons[row.id] || ''} onChangeText={value => setReasons({ ...reasons, [row.id]: value })} maxLength={1000} style={{ backgroundColor: surface, color: textColor, padding: 12, borderWidth: 1, borderColor: textColor, borderRadius: 10 }} />
      <GradientButton label={row.pendingDeletion ? 'Approve deletion' : 'Approve publication'} disabled={busy} onPress={() => review(row, 'approve')} />
      <GradientButton label="Reject" disabled={busy || !reasons[row.id]?.trim()} onPress={() => review(row, 'reject')} />
    </Card>)}
    {!loading && !rows.length ? <Text style={{ color: textColor }}>No pending submissions.</Text> : null}
  </View>
}
