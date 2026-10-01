import AdminPage from '../components/AdminPage'
import SuperAdminAccountForm from '../components/SuperAdminAccountForm'
export default function SuperAdminCreateLGU() {
  return <AdminPage title="Create LGU account" subtitle="Assign one municipality to this tourism officer"><SuperAdminAccountForm type="lgu" /></AdminPage>
}
