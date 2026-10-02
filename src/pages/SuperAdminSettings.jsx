import { StyleSheet, Text, View } from 'react-native'
import AdminPage from '../components/AdminPage'
import Card from '../components/Card'
import ChangePasswordButton from '../components/ChangePasswordButton'
import { colors } from '../theme/colors'
import { useAppTheme } from '../theme/useAppTheme'

export default function SuperAdminSettings() {
  const { themeStyle } = useAppTheme()
  return <AdminPage title="Settings" subtitle="Manage your Super Admin account settings">
    <Card style={styles.card}>
      <Text style={themeStyle(styles.heading)}>Account security</Text>
      <Text style={themeStyle(styles.description)}>Update your password to keep your account secure.</Text>
      <View style={styles.action}><ChangePasswordButton /></View>
    </Card>
  </AdminPage>
}

const styles = StyleSheet.create({
  card: { gap: 12, width: '100%', maxWidth: 640 },
  heading: { fontFamily: 'Poppins', fontSize: 18, fontWeight: '600', color: colors.oceanBlue },
  description: { fontFamily: 'DMSans', fontSize: 14, lineHeight: 22, color: colors.textMuted },
  action: { alignSelf: 'flex-start' },
})
