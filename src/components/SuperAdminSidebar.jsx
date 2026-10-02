import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Building2, ClipboardList, Compass, LayoutGrid, LogOut, Settings, ShieldCheck, Users } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { useAppTheme } from '../theme/useAppTheme'
import { FeedbackPressable } from './WorkspaceMotion'

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
  const logout = useAuthStore(state => state.logout)
  const foreground = { color: palette.onPrimary }
  return <ScrollView horizontal={compact} showsVerticalScrollIndicator={false}
    style={[compact ? styles.compact : styles.sidebar, { backgroundColor: palette.dark ? palette.deep : palette.primary }]}
    contentContainerStyle={[styles.content, compact && styles.mobileContent]}>
    {!compact && <>
      <View style={styles.brand}>
        <View style={[styles.brandIcon, { backgroundColor: palette.brand }]}><Compass size={22} color={palette.onPrimary} /></View>
        <View style={styles.grow}><Text style={[styles.brandName, foreground]}>Multraverse</Text><Text style={[styles.caption, foreground]}>Super Admin Console</Text></View>
      </View>
      <View style={styles.account}>
        <ShieldCheck size={20} color={palette.onPrimary} />
        <View style={styles.grow}><Text style={[styles.caption, foreground]}>Workspace</Text><Text style={[styles.accountName, foreground]}>Super Admin</Text></View>
      </View>
      <Text style={[styles.section, foreground]}>MANAGEMENT</Text>
    </>}
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
    <View style={[styles.footer, compact && styles.mobileFooter]}>
      <FeedbackPressable accessibilityRole="button" onPress={logout} style={({ pressed, hovered }) => [styles.logout, compact && styles.mobileLogout, (pressed || hovered) && styles.hover]}>
        <LogOut size={18} color={palette.button} /><Text style={[styles.label, { color: palette.button }]}>Log out</Text>
      </FeedbackPressable>
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
  navigation: { gap: 6 },
  mobileNavigation: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10 },
  label: { fontFamily: 'DMSans', fontSize: 14, flexShrink: 1 },
  activeLabel: { fontWeight: '700' },
  hover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  footer: { gap: 16, marginTop: 'auto', paddingTop: 16 },
  mobileFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 0, paddingTop: 0 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  mobileLogout: { borderTopWidth: 0 },
})
