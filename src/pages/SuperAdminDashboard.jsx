import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'
import AdminPage from '../components/AdminPage'
import AdminStatCard from '../components/AdminStatCard'
import GradientButton from '../components/GradientButton'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'
export default function SuperAdminDashboard({ navigation }) {
  const { text } = useAppTheme()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const load = () => {
      Promise.all([api.getManagedAccounts('lgu'), api.getManagedAccounts('admin'), api.getAuditLogs()]).then(([lgu, admins, audit]) => setStats({ lgu: lgu.length, admins: admins.length, events: audit.total })).catch(err => setError(err.message))
    }
    load()
    return navigation.addListener('focus', load)
  }, [navigation])
  return <AdminPage title="Super Admin Dashboard" subtitle="Account provisioning and system audit review">
    <View style={{ gap: 20 }}>
      {error ? <Text accessibilityRole="alert" style={{ color: text }}>{error}</Text> : !stats ? <ActivityIndicator /> : <View style={{ gap: 12 }}>
        <AdminStatCard label="LGU accounts" value={stats.lgu} delta="Municipality-scoped officers" />
        <AdminStatCard label="Admin accounts" value={stats.admins} delta="Content reviewers" />
        <AdminStatCard label="Audit events" value={stats.events} delta="Recorded account and review actions" />
      </View>}
      <GradientButton label="Manage LGU Accounts" onPress={() => navigation.navigate('SuperAdminUsers')} />
      <GradientButton label="Manage Admin Accounts" onPress={() => navigation.navigate('SuperAdminCreateAdmin')} />
      <GradientButton label="Audit Log" onPress={() => navigation.navigate('SuperAdminAuditLog')} />
    </View>
  </AdminPage>
}
