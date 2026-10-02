import { getLGUMunicipality } from '../data/lguMunicipalities'
import { useState } from 'react'
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native'
import { LogOut } from 'lucide-react-native'
import { useAuthStore } from '../store/authStore'
import { lguResources } from '../data/lguResources'
import { colors } from '../theme/colors'
import ChangePasswordButton from './ChangePasswordButton'
import LogoutConfirmationDialog from './LogoutConfirmationDialog'

export default function LGUSidebar({ activeResource, onNavigate, compact }) {
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  const [confirmLogout, setConfirmLogout] = useState(false)
  return <><View style={compact ? styles.compact : styles.sidebar}>
    <ScrollView horizontal={compact} style={compact ? styles.compactNavigation : styles.navigation} contentContainerStyle={{ padding: 16, gap: 12 }}>
    {!compact && <><Text style={styles.brand}>Multraverse LGU</Text><Text style={styles.text}>{getLGUMunicipality(user?.municipality)?.name || 'Unassigned municipality'}</Text></>}
    {Object.entries(lguResources).map(([key, value]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: activeResource === key }} onPress={() => onNavigate(key)} style={[styles.item, activeResource === key && styles.active]}><Text style={styles.text}>{value.label}</Text></Pressable>)}
    </ScrollView>
    <View style={[styles.account, compact && styles.compactAccount]}>
      {!compact && <Text style={styles.accountLabel}>ACCOUNT</Text>}
      <ChangePasswordButton inverted />
      <Pressable accessibilityRole="button" onPress={() => setConfirmLogout(true)} style={[styles.item, styles.logout]}><LogOut size={18} color={colors.white} /><Text style={styles.text}>Log out</Text></Pressable>
    </View>
  </View>
    {confirmLogout && <LogoutConfirmationDialog onCancel={() => setConfirmLogout(false)} onConfirm={logout} />}
  </>
}
const styles = StyleSheet.create({
  sidebar: { width: 260, maxWidth: 260, backgroundColor: colors.oceanBlue },
  compact: { flexGrow: 0, backgroundColor: colors.oceanBlue },
  navigation: { flex: 1 },
  compactNavigation: { flexGrow: 0 },
  account: { padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)' },
  compactAccount: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  accountLabel: { color: colors.white, fontSize: 11, letterSpacing: 1, paddingHorizontal: 12, opacity: 0.75 },
  logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 8, minHeight: 44 },
  brand: { color: colors.white, fontSize: 20, fontFamily: 'Poppins' },
  text: { color: colors.white, fontFamily: 'DMSans' },
  item: { padding: 12, borderRadius: 10, justifyContent: 'center' },
  active: { backgroundColor: colors.sunsetCoral },
})
