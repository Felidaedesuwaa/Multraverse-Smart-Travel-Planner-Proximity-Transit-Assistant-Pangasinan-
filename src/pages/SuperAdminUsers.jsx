import { useNavigation } from '@react-navigation/native'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import AdminPage from '../components/AdminPage'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import GradientButton from '../components/GradientButton'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'

export function SuperAdminAccountList({ type = 'lgu', refreshKey = 0 }) {
  const { text } = useAppTheme()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const navigation = useNavigation()
  useEffect(() => navigation.addListener('focus', () => setRefresh(value => value + 1)), [navigation])
  useEffect(() => {
    let active = true
    setRows(null); setError('')
    api.getManagedAccounts(type).then(data => { if (active) setRows(data) }).catch(err => { if (active) setError(err.message) })
    return () => { active = false }
  }, [type, refresh, refreshKey])
  return <Card style={{ gap: 12 }}>
    <Pressable accessibilityRole="button" onPress={() => setRefresh(value => value + 1)}><Text style={{ color: text }}>Refresh accounts</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={{ color: text }}>{error}</Text> : !rows ? <ActivityIndicator /> : <ScrollView horizontal>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row' }}>{['Email', 'Role', 'Municipality', 'Created', 'Created by'].map(label => <Text key={label} style={{ color: text, width: 200, fontWeight: 'bold' }}>{label}</Text>)}</View>
        {rows.map(row => <View key={row.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text selectable style={{ color: text, width: 200 }}>{row.email}</Text>
          <View style={{ width: 200 }}><StatusBadge status={row.role.toLowerCase()} /></View>
          <Text style={{ color: text, width: 200 }}>{row.municipality || '-'}</Text>
          <Text style={{ color: text, width: 200 }}>{new Date(row.createdAt).toLocaleString()}</Text>
          <Text style={{ color: text, width: 200 }}>{row.createdBy?.email || 'Seed / legacy account'}</Text>
        </View>)}
        {!rows.length && <Text style={{ color: text }}>No accounts yet.</Text>}
      </View>
    </ScrollView>}
  </Card>
}
export default function SuperAdminUsers({ navigation }) {
  return <AdminPage title="Manage LGU Accounts" subtitle="Municipal tourism officers across Pangasinan">
    <View style={{ gap: 20 }}><GradientButton label="Create LGU account" onPress={() => navigation.navigate('SuperAdminCreateLGU')} /><SuperAdminAccountList /></View>
  </AdminPage>
}
