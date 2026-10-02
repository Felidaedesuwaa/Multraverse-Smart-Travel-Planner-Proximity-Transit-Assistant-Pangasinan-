import { useState } from 'react'
import { Plus } from 'lucide-react-native'
import { WorkspaceButton, WorkspacePage } from '../components/SuperAdminWorkspace'
import SuperAdminAccountForm from '../components/SuperAdminAccountForm'
import { SuperAdminAccountList } from './SuperAdminUsers'
export default function SuperAdminCreateAdmin() {
  const [refresh, setRefresh] = useState(0)
  const [creating, setCreating] = useState(false)
  return <WorkspacePage title="Manage Admin Accounts" subtitle="Manage the administrators who review and maintain platform content." actions={<WorkspaceButton primary label={creating ? 'Close form' : 'Create Admin account'} icon={Plus} onPress={() => setCreating(value => !value)} />}>
    {creating && <SuperAdminAccountForm type="admin" onCreated={() => setRefresh(value => value + 1)} />}
    <SuperAdminAccountList type="admin" refreshKey={refresh} />
  </WorkspacePage>
}
