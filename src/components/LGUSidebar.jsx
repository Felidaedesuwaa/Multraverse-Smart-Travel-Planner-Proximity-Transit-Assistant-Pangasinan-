import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Compass, MapPin, Utensils, Wallet, Radio, Route, LogOut, Building2, ShieldCheck } from 'lucide-react-native'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import { useAuthStore } from '../store/authStore'
import { lguResources } from '../data/lguResources'
import { colors } from '../theme/colors'

export default function LGUSidebar({ activeResource, onNavigate, compact }) {
  const { palette } = useAppTheme()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  return <ScrollView horizontal={compact} style={compact ? styles.compact : styles.sidebar} contentContainerStyle={{ padding: 16, gap: 12 }}>
    {!compact && <><Text style={styles.brand}>Multraverse LGU</Text><Text style={styles.text}>{getLGUMunicipality(user?.municipality)?.name || 'Unassigned municipality'}</Text></>}
    {Object.entries(lguResources).map(([key, value]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: activeResource === key }} onPress={() => onNavigate(key)} style={[styles.item, activeResource === key && styles.active]}><Text style={styles.text}>{value.label}</Text></Pressable>)}
    <Pressable accessibilityRole="button" onPress={logout} style={styles.item}><Text style={styles.text}>Log out</Text></Pressable>
  </ScrollView>
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
