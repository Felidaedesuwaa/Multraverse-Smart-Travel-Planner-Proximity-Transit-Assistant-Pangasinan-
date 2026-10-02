import { useState } from 'react'
import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native'
import { Compass, MapPin, Utensils, Wallet, Radio, Route, LogOut, Building2, ShieldCheck } from 'lucide-react-native'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import { useAuthStore } from '../store/authStore'
import { lguResources } from '../data/lguResources'
import { useAppTheme } from '../theme/useAppTheme'
import ChangePasswordButton from './ChangePasswordButton'
import LogoutConfirmationDialog from './LogoutConfirmationDialog'

const resourceIcons = { places: MapPin, foods: Utensils, 'route-prices': Wallet, geofences: Radio, 'transit-routes': Route }

export default function LGUSidebar({ activeResource, onNavigate, compact }) {
  const { palette } = useAppTheme()
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const foreground = { color: palette.onPrimary }

  return <>
    <View style={[compact ? styles.compact : styles.sidebar, { backgroundColor: palette.dark ? palette.deep : palette.primary }]}>
      {!compact && <>
        <View style={styles.brand}>
          <View style={[styles.brandIcon, { backgroundColor: palette.brand }]}><Compass size={22} color={palette.onPrimary} /></View>
          <View style={styles.grow}><Text style={[styles.brandName, foreground]}>Multraverse</Text><Text style={[styles.caption, foreground]}>LGU Workspace</Text></View>
        </View>
        <View style={styles.municipality}>
          <Building2 size={20} color={palette.button} />
          <View style={styles.grow}><Text style={[styles.caption, foreground]}>Municipality</Text><Text style={[styles.municipalityName, foreground]}>{getLGUMunicipality(user?.municipality)?.name || 'Unassigned municipality'}</Text></View>
        </View>
        <Text style={[styles.section, foreground]}>LOCAL INFORMATION</Text>
      </>}
      <ScrollView horizontal={compact} style={compact ? styles.mobileScroll : styles.grow} contentContainerStyle={compact ? styles.mobileNavigation : styles.navigation}>
        {Object.entries(lguResources).map(([key, value]) => {
          const active = activeResource === key
          const Icon = resourceIcons[key]
          const color = active ? palette.button : palette.onPrimary
          return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onNavigate(key)} style={({ pressed, hovered }) => [styles.item, active && styles.active, (pressed || hovered) && styles.hover]}>
            <Icon size={18} color={color} /><Text style={[styles.label, { color }, active && styles.activeLabel]}>{value.label}</Text>
          </Pressable>
        })}
      </ScrollView>
      <View style={styles.footer}>
        {!compact && <View style={styles.review}><ShieldCheck size={20} color={palette.button} /><Text style={[styles.caption, styles.grow, foreground]}>Submissions are reviewed by Admin before publishing.</Text></View>}
        <View style={[styles.account, compact && styles.compactAccount]}>
          {!compact && <Text style={[styles.section, foreground]}>ACCOUNT</Text>}
          <ChangePasswordButton inverted />
          <Pressable accessibilityRole="button" onPress={() => setConfirmLogout(true)} style={({ pressed, hovered }) => [styles.item, (pressed || hovered) && styles.hover]}><LogOut size={18} color={palette.onPrimary} /><Text style={[styles.label, foreground]}>Log out</Text></Pressable>
        </View>
      </View>
    </View>
    {confirmLogout && <LogoutConfirmationDialog onCancel={() => setConfirmLogout(false)} onConfirm={logout} />}
  </>
}

const styles = StyleSheet.create({
  sidebar: { width: 260, padding: 18, gap: 20 }, compact: { width: '100%', padding: 16, gap: 14 },
  grow: { flex: 1, minWidth: 0 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  brandIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: 'Poppins', fontSize: 16, fontWeight: '700' }, caption: { fontFamily: 'DMSans', fontSize: 11, opacity: 0.72, lineHeight: 18 },
  municipality: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)' },
  municipalityName: { fontFamily: 'DMSans', fontSize: 14, fontWeight: '600', marginTop: 3 }, section: { fontFamily: 'DMSans', fontSize: 10, letterSpacing: 1.2, opacity: 0.6, paddingHorizontal: 12 },
  navigation: { gap: 6 }, mobileNavigation: { gap: 8, alignItems: 'center' }, mobileScroll: { flexGrow: 0 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10, minHeight: 44 },
  label: { fontFamily: 'DMSans', fontSize: 14 }, activeLabel: { fontWeight: '700' }, active: { backgroundColor: 'rgba(255,255,255,0.12)' }, hover: { backgroundColor: 'rgba(255,255,255,0.08)' },
  footer: { gap: 16 }, review: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  account: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  compactAccount: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' },
})
