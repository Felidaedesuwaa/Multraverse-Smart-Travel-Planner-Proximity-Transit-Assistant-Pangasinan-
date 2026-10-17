import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react-native'
import { WorkspaceButton, WorkspacePage } from '../components/SuperAdminWorkspace'
import SuperAdminAccountForm from '../components/SuperAdminAccountForm'
import { SuperAdminAccountList } from './SuperAdminUsers'
export default function SuperAdminCreateAdmin() {
  const [refresh, setRefresh] = useState(0)
  const [creating, setCreating] = useState(false)
  return <WorkspacePage title={creating ? 'Create Admin account' : 'Manage Admin Accounts'} subtitle={creating ? 'Set up an administrator to review and maintain platform content.' : 'Manage the administrators who review and maintain platform content.'} actions={creating ? <WorkspaceButton label="Back to accounts" icon={ArrowLeft} onPress={() => setCreating(false)} /> : <WorkspaceButton primary label="Create Admin account" icon={Plus} onPress={() => setCreating(true)} />}>
    {creating ? <SuperAdminAccountForm type="admin" onCreated={() => setRefresh(value => value + 1)} /> : <SuperAdminAccountList type="admin" refreshKey={refresh} />}
  </WorkspacePage>
}
