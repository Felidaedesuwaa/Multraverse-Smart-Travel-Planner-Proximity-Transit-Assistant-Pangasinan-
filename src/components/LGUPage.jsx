import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import { useAuthStore } from '../store/authStore'
import { useAppTheme } from '../theme/useAppTheme'
import { colors } from '../theme/colors'

export default function LGUPage({ title, subtitle, actions, children }) {
  const municipality = useAuthStore(state => state.user?.municipality)
  const { themeStyle } = useAppTheme()
  const { width } = useWindowDimensions()
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={themeStyle([styles.screen, width < 768 && { padding: 16 }])}>
    <View style={styles.container}><View style={styles.header}><View style={styles.heading}><Text style={themeStyle(styles.eyebrow)}>MUNICIPAL WORKSPACE</Text><Text style={themeStyle(styles.title)}>{title}</Text><Text style={themeStyle(styles.subtitle)}>{subtitle || `${getLGUMunicipality(municipality)?.name || 'Unassigned municipality'} / Manage local information and track Admin approvals.`}</Text></View>{actions}</View>
    {children}</View>
  </ScrollView>
}
const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 32, backgroundColor: colors.warmSand }, container: { width: '100%', maxWidth: 1440, alignSelf: 'center' }, header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 28 }, heading: { flexGrow: 1, flexBasis: 260, gap: 8 },
  eyebrow: { fontFamily: 'DMSans', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: colors.textMuted },
  title: { fontFamily: 'Poppins', fontSize: 26, fontWeight: '700', color: colors.oceanBlue },
  subtitle: { fontFamily: 'DMSans', fontSize: 13, lineHeight: 20, color: colors.textMuted },
})
