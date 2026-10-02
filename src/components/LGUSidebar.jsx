import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Compass, MapPin, Utensils, Wallet, Radio, Route, LogOut, Building2, ShieldCheck } from 'lucide-react-native'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import { useAuthStore } from '../store/authStore'
import { lguResources } from '../data/lguResources'
import { useAppTheme } from '../theme/useAppTheme'
import { FeedbackPressable } from './WorkspaceMotion'

const icons = { places: MapPin, foods: Utensils, 'route-prices': Wallet, geofences: Radio, 'transit-routes': Route }

export default function LGUSidebar({ activeResource, onNavigate, compact }) {
  const { palette } = useAppTheme()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const municipality = getLGUMunicipality(user?.municipality)?.name || 'Unassigned municipality'
  const foreground = { color: palette.onPrimary }
  return <View style={[styles.sidebar, compact && styles.compact, { backgroundColor: palette.dark ? palette.deep : palette.primary }]}>
    <View style={styles.brand}>
      <View style={[styles.brandIcon, { backgroundColor: palette.brand }]}><Compass size={22} color={palette.onPrimary} /></View>
      <View style={styles.grow}><Text style={[styles.brandName, foreground]}>Multraverse</Text><Text style={[styles.caption, foreground]}>LGU Console</Text></View>
      {compact && <FeedbackPressable accessibilityRole="button" accessibilityLabel="Log out" onPress={logout} style={styles.logoutIcon}><LogOut size={20} color={palette.onPrimary} /></FeedbackPressable>}
    </View>
    {!compact && <View style={styles.municipality}><Building2 size={18} color={palette.onPrimary} /><View style={styles.grow}><Text style={[styles.caption, foreground]}>MUNICIPAL WORKSPACE</Text><Text style={[styles.municipalityName, foreground]}>{municipality}</Text></View></View>}
    {!compact && <Text style={[styles.section, foreground]}>CONTENT MANAGEMENT</Text>}
    <ScrollView horizontal={compact} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={compact ? styles.mobileScroll : styles.grow} contentContainerStyle={[styles.navigation, compact && styles.mobileNavigation]}>
      {Object.entries(lguResources).map(([key, value]) => {
        const Icon = icons[key]
        const active = activeResource === key
        return <FeedbackPressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onNavigate(key)} style={({ hovered, pressed }) => [styles.item, active && { backgroundColor: palette.deep }, (hovered || pressed) && !active && styles.hover]}>
          <Icon size={18} color={active ? palette.button : palette.onPrimary} />
          <Text style={[styles.label, { color: active ? palette.button : palette.onPrimary }, active && styles.activeLabel]}>{value.label}</Text>
        </FeedbackPressable>
      })}
    </ScrollView>
    {!compact && <View style={styles.footer}>
      <View style={styles.review}><ShieldCheck size={20} color={palette.onPrimary} /><View style={styles.grow}><Text style={[styles.label, foreground]}>Admin review</Text><Text style={[styles.caption, foreground]}>Submissions require approval</Text></View></View>
      <FeedbackPressable accessibilityRole="button" onPress={logout} style={styles.logout}><LogOut size={18} color={palette.onPrimary} /><Text style={[styles.label, foreground]}>Log out</Text></FeedbackPressable>
    </View>}
  </View>
}

const styles = StyleSheet.create({
  sidebar: { width: 260, padding: 18, gap: 20 }, compact: { width: '100%', padding: 16, gap: 14 },
  grow: { flex: 1, minWidth: 0 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  brandIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Poppins', fontSize: 16, fontWeight: '700' }, caption: { fontFamily: 'DMSans', fontSize: 11, opacity: 0.72, lineHeight: 18 },
  municipality: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  municipalityName: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '600', marginTop: 3 }, section: { fontFamily: 'DMSans', fontSize: 10, letterSpacing: 1.2, opacity: 0.6, paddingHorizontal: 12 },
  navigation: { gap: 6 }, mobileNavigation: { gap: 8, alignItems: 'center' }, mobileScroll: { flexGrow: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10 },
  label: { fontFamily: 'DMSans', fontSize: 14 }, activeLabel: { fontWeight: '700' }, hover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  footer: { gap: 16 }, review: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }, logoutIcon: { padding: 12 },
})
