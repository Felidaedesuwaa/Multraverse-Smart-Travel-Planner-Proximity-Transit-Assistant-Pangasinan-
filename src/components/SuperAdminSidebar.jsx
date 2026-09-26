import { Pressable, ScrollView, Text } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { colors } from '../theme/colors'
const sections = [
  ['SuperAdminDashboard', 'Overview'],
  ['SuperAdminUsers', 'Manage LGU Accounts'],
  ['SuperAdminCreateAdmin', 'Manage Admin Accounts'],
  ['SuperAdminAuditLog', 'Audit Log'],
]
export default function SuperAdminSidebar({ activeScreen, onNavigate, compact }) {
  const logout = useAuthStore(state => state.logout)
  return <ScrollView horizontal={compact} style={{ backgroundColor: colors.oceanBlue, ...(compact ? { flexGrow: 0 } : { width: 260, maxWidth: 260 }) }} contentContainerStyle={{ padding: 18, gap: 12 }}>
    {!compact && <Text style={{ color: colors.white, fontFamily: 'Poppins', fontSize: 20 }}>Super Admin</Text>}
    {sections.map(([screen, label]) => <Pressable key={screen} accessibilityRole="button" accessibilityState={{ selected: activeScreen === screen }} onPress={() => onNavigate(screen)} style={{ padding: 12, borderRadius: 10, backgroundColor: activeScreen === screen ? colors.sunsetCoral : 'transparent' }}><Text style={{ color: colors.white }}>{label}</Text></Pressable>)}
    <Pressable accessibilityRole="button" onPress={logout} style={{ padding: 12 }}><Text style={{ color: colors.white }}>Log out</Text></Pressable>
  </ScrollView>
}
