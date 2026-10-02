import { StyleSheet, Text, View } from 'react-native'
import Card from './Card'
import { colors } from '../theme/colors'
import { useAppTheme } from '../theme/useAppTheme'

export default function MunicipalStatCard({ label, value, delta, icon, iconBg }) {
  const { themeStyle } = useAppTheme()
  return <Card style={styles.card}>
    <View style={styles.row}><Text style={themeStyle(styles.label)}>{label}</Text><View style={themeStyle([styles.icon, { backgroundColor: iconBg || colors.oceanBlueLight }])}>{icon}</View></View>
    <Text style={themeStyle(styles.value)}>{value}</Text>
    <Text style={themeStyle(styles.caption)}>{delta}</Text>
  </Card>
}
const styles = StyleSheet.create({
  card: { flex: 1, padding: 22, shadowOpacity: 0, elevation: 0, borderRadius: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: { flex: 1, fontFamily: 'DMSans', fontSize: 13, fontWeight: '600', color: colors.textMuted },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: 'Poppins', fontSize: 32, fontWeight: '700', color: colors.textPrimary, marginTop: 12 },
  caption: { fontFamily: 'DMSans', fontSize: 12, color: colors.textMuted, marginTop: 4 },
})
