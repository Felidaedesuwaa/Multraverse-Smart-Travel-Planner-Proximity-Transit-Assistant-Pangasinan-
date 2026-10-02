import { ArrowLeft } from 'lucide-react-native'
import { WorkspaceButton, WorkspacePage } from '../components/SuperAdminWorkspace'
import SuperAdminAccountForm from '../components/SuperAdminAccountForm'
export default function SuperAdminCreateLGU({ navigation }) {
  return <WorkspacePage title="Create LGU account" subtitle="Assign a municipal tourism officer to one municipality." actions={<WorkspaceButton label="Back to accounts" icon={ArrowLeft} onPress={() => navigation.navigate('SuperAdminUsers')} />}><SuperAdminAccountForm type="lgu" /></WorkspacePage>
}
