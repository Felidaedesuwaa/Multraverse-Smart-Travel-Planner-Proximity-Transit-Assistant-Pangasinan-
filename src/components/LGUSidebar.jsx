import { getLGUMunicipality } from '../data/lguMunicipalities'
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { lguResources } from '../data/lguResources'
import { colors } from '../theme/colors'

export default function LGUSidebar({ activeResource, onNavigate, compact }) {
  const user = useAuthStore(state => state.user)
  const logout = useAuthStore(state => state.logout)
  return <ScrollView horizontal={compact} style={compact ? styles.compact : styles.sidebar} contentContainerStyle={{ padding: 16, gap: 12 }}>
    {!compact && <><Text style={styles.brand}>Multraverse LGU</Text><Text style={styles.text}>{getLGUMunicipality(user?.municipality)?.name || 'Unassigned municipality'}</Text></>}
    {Object.entries(lguResources).map(([key, value]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: activeResource === key }} onPress={() => onNavigate(key)} style={[styles.item, activeResource === key && styles.active]}><Text style={styles.text}>{value.label}</Text></Pressable>)}
    <Pressable accessibilityRole="button" onPress={logout} style={styles.item}><Text style={styles.text}>Log out</Text></Pressable>
  </ScrollView>
}
const styles = StyleSheet.create({
  sidebar: { width: 260, maxWidth: 260, backgroundColor: colors.oceanBlue },
  compact: { flexGrow: 0, backgroundColor: colors.oceanBlue },
  brand: { color: colors.white, fontSize: 20, fontFamily: 'Poppins' },
  text: { color: colors.white, fontFamily: 'DMSans' },
  item: { padding: 12, borderRadius: 10, justifyContent: 'center' },
  active: { backgroundColor: colors.sunsetCoral },
})
