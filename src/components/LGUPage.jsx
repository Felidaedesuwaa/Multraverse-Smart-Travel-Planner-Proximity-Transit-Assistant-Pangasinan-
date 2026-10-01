import { getLGUMunicipality } from '../data/lguMunicipalities'
import AdminPage from './AdminPage'
import { useAuthStore } from '../store/authStore'
export default function LGUPage({ title, children }) {
  const municipality = useAuthStore(state => state.user?.municipality)
  return <AdminPage title={title} subtitle={`${getLGUMunicipality(municipality)?.name || 'Unassigned municipality'} - Submissions require Admin approval`}>{children}</AdminPage>
}
