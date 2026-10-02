import { useNavigation } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TextInput, View } from 'react-native'
import { Plus, RefreshCw, Search } from 'lucide-react-native'
import { WorkspaceButton, WorkspacePage, WorkspacePanel, WorkspaceTable, ui } from '../components/SuperAdminWorkspace'
import SuperAdminAccountAction from '../components/SuperAdminAccountAction'
import AccountActionButton from '../components/AccountActionButton'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'

export function SuperAdminAccountList({ type = 'lgu', refreshKey = 0 }) {
  const { palette: p } = useAppTheme()
  const [accountAction, setAccountAction] = useState(null)
  const [notice, setNotice] = useState('')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [refresh, setRefresh] = useState(0)
  const navigation = useNavigation()
  useEffect(() => navigation.addListener('focus', () => setRefresh(value => value + 1)), [navigation])
  useEffect(() => {
    let active = true
    setRows(null); setError('')
    api.getManagedAccounts(type).then(data => { if (active) setRows(data) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [type, refresh, refreshKey])
  const visible = (rows || []).filter(row => [row.email, row.municipality, row.createdBy?.email].some(value => value?.toLowerCase().includes(search.trim().toLowerCase())))
  return <WorkspacePanel>
    {accountAction && <SuperAdminAccountAction key={accountAction.account.id + accountAction.mode} {...accountAction} type={type} onClose={() => setAccountAction(null)} onSaved={message => { setAccountAction(null); setNotice(message); setRefresh(value => value + 1) }} />}
    {notice ? <Text accessibilityRole="alert" style={[ui.body, { color: p.ink }]}>{notice}</Text> : null}
    <View style={ui.toolbar}><View style={{ gap: 4 }}><Text style={[ui.heading, { color: p.ink }]}>{type === 'lgu' ? 'Municipal officers' : 'Administrators'}</Text><Text style={[ui.caption, { color: p.muted }]}>{rows ? `${rows.length} accounts � ${visible.length} shown` : 'Account directory'}</Text></View><WorkspaceButton label="Refresh" icon={RefreshCw} loading={!rows && !error} onPress={() => setRefresh(value => value + 1)} /></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: p.line, borderRadius: 12, paddingHorizontal: 14 }}><Search size={18} color={p.muted} /><TextInput accessibilityLabel="Search accounts" placeholder="Search email, municipality or creator..." placeholderTextColor={p.muted} value={search} onChangeText={setSearch} style={[ui.body, { flex: 1, minWidth: 0, paddingVertical: 14, color: p.ink }]} /></View>
    {error ? <Text accessibilityRole="alert" style={[ui.body, { color: p.accent }]}>{error}</Text> : !rows ? <View style={ui.empty}><ActivityIndicator color={p.ink} /><Text style={[ui.caption, { color: p.muted }]}>Loading accounts...</Text></View> : <WorkspaceTable renderActions={row => <View style={{ flexDirection: 'row', gap: 8 }}><AccountActionButton mode="edit" label={"Edit information for " + row.account.email} onPress={() => { setNotice(''); setAccountAction({ account: row.account, mode: 'edit' }) }} /><AccountActionButton mode="delete" label={"Delete account " + row.account.email} onPress={() => { setNotice(''); setAccountAction({ account: row.account, mode: 'delete' }) }} /></View>} columns={['Email', 'Role', ...(type === 'lgu' ? ['Municipality'] : []), 'Created', 'Created by']} rows={visible.map(row => ({ id: row.id, account: row, cells: [row.email, row.role === 'LGU' ? 'LGU officer' : 'Administrator', ...(type === 'lgu' ? [row.municipality || 'Unassigned'] : []), new Date(row.createdAt).toLocaleString(), row.createdBy?.email || 'Seed / legacy account'] }))} empty={search.trim() ? 'No matching accounts. Try a different search.' : 'No accounts yet. Create an account to get started.'} />}
  </WorkspacePanel>
}
export default function SuperAdminUsers({ navigation }) {
  return <WorkspacePage title="Manage LGU Accounts" subtitle="Manage municipal tourism officers and their access across Pangasinan." actions={<WorkspaceButton primary label="Create LGU account" icon={Plus} onPress={() => navigation.navigate('SuperAdminCreateLGU')} />}><SuperAdminAccountList /></WorkspacePage>
}
