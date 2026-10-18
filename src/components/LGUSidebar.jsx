import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { Compass, MapPin, Utensils, Wallet, Route, ShieldCheck, LayoutDashboard, Settings } from 'lucide-react-native'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import { useAuthStore } from '../store/authStore'
import { lguResources } from '../data/lguResources'
import { useAppTheme } from '../theme/useAppTheme'
import SidebarLogoutButton from './SidebarLogoutButton'
import ProfileAvatar from './ProfileAvatar'
const resourceIcons = { dashboard: LayoutDashboard, settings: Settings, places: MapPin, foods: Utensils, 'route-prices': Wallet, 'transit-routes': Route }

export default function LGUSidebar({ activeResource, onNavigate, compact }) {
  const { palette } = useAppTheme()
  const { width } = useWindowDimensions()
  const user = useAuthStore(state => state.user)
  const foreground = { color: palette.onPrimary }
  const navigation = Object.entries({ dashboard: { label: 'Dashboard' }, ...lguResources, settings: { label: 'Settings' } }).map(([key, value]) => {
    const active = activeResource === key
    const Icon = resourceIcons[key]
    return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onNavigate(key)} style={({ pressed, hovered }) => [styles.item, active && { backgroundColor: palette.deep }, (pressed || hovered) && !active && styles.hover]}>
      <Icon size={18} color={active ? palette.button : palette.onPrimary} />
      <Text style={[styles.label, foreground, active && styles.activeLabel, active && { color: palette.button }]}>{value.label}</Text>
    </Pressable>
  })
  return <><View style={[compact ? styles.compact : [styles.sidebar, { width: width >= 1200 ? 304 : 272 }], { backgroundColor: palette.sidebar, borderRightWidth: compact ? 0 : 1, borderBottomWidth: compact ? 1 : 0, borderColor: palette.sidebarBorder }]}>
    <View style={styles.brand}>
      <View style={[styles.brandIcon, { backgroundColor: palette.brand }]}><Compass size={22} color={palette.onPrimary} /></View>
      <View style={styles.grow}><Text style={[styles.brandName, foreground]}>Multraverse</Text><Text style={[styles.caption, foreground]}>LGU Admin Console</Text></View>
    </View>
    <View style={styles.municipality}>
      <ProfileAvatar user={user} size={44} />
      <View style={styles.grow}><Text numberOfLines={1} style={[styles.municipalityName, foreground]}>{user?.name || 'LGU officer'}</Text><Text style={[styles.caption, foreground]}>{getLGUMunicipality(user?.municipality)?.name || 'Unassigned municipality'}</Text></View>
      <SidebarLogoutButton />
    </View>
    {!compact && <Text style={[styles.section, foreground]}>MANAGE LOCAL INFORMATION</Text>}
    <ScrollView horizontal={compact} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false} style={compact ? styles.mobileScroll : styles.grow} contentContainerStyle={compact ? styles.mobileNavigation : styles.navigation}>{navigation}</ScrollView>
    {!compact && <View style={styles.footer}>
      <View style={styles.review}><ShieldCheck size={20} color={palette.onPrimary} /><Text style={[styles.caption, styles.grow, foreground]}>Submissions require Admin approval before publication.</Text></View>
    </View>}
  </View>
  </>
}

const styles = StyleSheet.create({
  sidebar: { width: 260, flexShrink: 0, padding: 22, gap: 24 }, compact: { width: '100%', flexShrink: 0, padding: 16, gap: 14 },
  grow: { flex: 1, minWidth: 0 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  brandIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Poppins', fontSize: 16, fontWeight: '700' }, caption: { fontFamily: 'DMSans', fontSize: 12, opacity: 0.72, lineHeight: 18 },
  municipality: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  municipalityName: { fontFamily: 'DMSans', fontSize: 15, fontWeight: '600', marginTop: 3 }, section: { fontFamily: 'DMSans', fontSize: 10, letterSpacing: 1.2, opacity: 0.6, paddingHorizontal: 12 },
  navigation: { gap: 10 }, mobileNavigation: { gap: 12, alignItems: 'center' }, mobileScroll: { flexGrow: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 16, borderRadius: 10, minHeight: 44 },
  label: { fontFamily: 'DMSans', fontSize: 15 }, activeLabel: { fontWeight: '700' }, active: { backgroundColor: 'rgba(255,255,255,0.12)' }, hover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  footer: { gap: 16 }, review: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  account: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  compactAccount: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
})
