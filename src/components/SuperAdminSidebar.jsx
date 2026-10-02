import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Building2, ClipboardList, Compass, LayoutGrid, Settings, Users } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { useAppTheme } from '../theme/useAppTheme'
import { FeedbackPressable } from './WorkspaceMotion'
import ProfileAvatar from './ProfileAvatar'
import SidebarLogoutButton from './SidebarLogoutButton'

const sections = [
  ['SuperAdminDashboard', 'Overview', LayoutGrid],
  ['SuperAdminUsers', 'Manage LGU Accounts', Building2],
  ['SuperAdminCreateAdmin', 'Manage Admin Accounts', Users],
  ['SuperAdminUserAccounts', 'Manage User Accounts', Users],
  ['SuperAdminAuditLog', 'Audit Log', ClipboardList],
  ['SuperAdminSettings', 'Settings', Settings],
]

export default function SuperAdminSidebar({ activeScreen, onNavigate, compact }) {
  const { palette } = useAppTheme()
  const user = useAuthStore(state => state.user)
  const foreground = { color: palette.onPrimary }
  return <ScrollView horizontal={compact} showsVerticalScrollIndicator={false}
    style={[compact ? styles.compact : styles.sidebar, { backgroundColor: palette.dark ? palette.deep : palette.primary }]}
    contentContainerStyle={[styles.content, compact && styles.mobileContent]}>
    {!compact && <>
      <View style={styles.brand}>
        <View style={[styles.brandIcon, { backgroundColor: palette.brand }]}><Compass size={22} color={palette.onPrimary} /></View>
        <View style={styles.grow}><Text style={[styles.brandName, foreground]}>Multraverse</Text><Text style={[styles.caption, foreground]}>Super Admin Console</Text></View>
      </View>
    </>}
    <View style={[styles.account, compact && { minWidth: 230, maxWidth: 280 }]}>
      <ProfileAvatar user={user} size={34} />
      <View style={styles.grow}><Text numberOfLines={1} style={[styles.accountName, foreground]}>{user?.name || 'Super Admin'}</Text><Text style={[styles.caption, foreground]}>Super Admin</Text></View>
      <SidebarLogoutButton />
    </View>
    {!compact && <Text style={[styles.section, foreground]}>MANAGEMENT</Text>}
    <View style={[styles.navigation, compact && styles.mobileNavigation]}>
      {sections.map(([screen, label, Icon]) => {
        const active = activeScreen === screen || (screen === 'SuperAdminUsers' && activeScreen === 'SuperAdminCreateLGU')
        return <FeedbackPressable key={screen} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onNavigate(screen)}
          style={({ pressed, hovered }) => [styles.item, active && { backgroundColor: palette.deep }, (pressed || hovered) && !active && styles.hover]}>
          <Icon size={18} color={active ? palette.button : palette.onPrimary} />
          <Text style={[styles.label, { color: active ? palette.button : palette.onPrimary }, active && styles.activeLabel]}>{label}</Text>
        </FeedbackPressable>
      })}
    </View>
  </ScrollView>
}

const styles = StyleSheet.create({
  sidebar: { width: 260, minWidth: 260, maxWidth: 260 },
  compact: { width: '100%', flexGrow: 0, flexShrink: 0 },
  content: { flexGrow: 1, padding: 18, gap: 20 },
  mobileContent: { padding: 16, gap: 14, alignItems: 'center' },
  grow: { flex: 1, minWidth: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  brandIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Poppins', fontSize: 16, fontWeight: '700' },
  caption: { fontFamily: 'DMSans', fontSize: 11, opacity: 0.72, lineHeight: 18 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  accountName: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '600', marginTop: 3 },
  section: { fontFamily: 'DMSans', fontSize: 10, letterSpacing: 1.2, opacity: 0.6, paddingHorizontal: 12 },
  navigation: { gap: 10 },
  mobileNavigation: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10, minHeight: 48 },
  label: { fontFamily: 'DMSans', fontSize: 14, flexShrink: 1 },
  activeLabel: { fontWeight: '700' },
  hover: { backgroundColor: 'rgba(255,255,255,0.08)' },
})
