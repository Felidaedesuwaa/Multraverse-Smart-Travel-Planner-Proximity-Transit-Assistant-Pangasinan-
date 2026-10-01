import { useState } from 'react'
import { View } from 'react-native'
import AdminPage from '../components/AdminPage'
import SuperAdminAccountForm from '../components/SuperAdminAccountForm'
import { SuperAdminAccountList } from './SuperAdminUsers'
export default function SuperAdminCreateAdmin() {
  const [refresh, setRefresh] = useState(0)
  return <AdminPage title="Manage Admin Accounts" subtitle="Create accounts for content review and administration">
    <View style={{ gap: 20 }}><SuperAdminAccountForm type="admin" onCreated={() => setRefresh(value => value + 1)} /><SuperAdminAccountList type="admin" refreshKey={refresh} /></View>
  </AdminPage>
}
