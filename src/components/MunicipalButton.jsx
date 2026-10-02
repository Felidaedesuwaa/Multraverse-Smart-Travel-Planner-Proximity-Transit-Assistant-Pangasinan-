import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { colors } from '../theme/colors'
import { useAppTheme } from '../theme/useAppTheme'

export default function MunicipalButton({ label, loading, disabled, onPress, style }) {
  const { themeStyle, palette } = useAppTheme()
  const unavailable = Boolean(disabled || loading)
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: unavailable, busy: Boolean(loading) }} disabled={unavailable} onPress={onPress} style={({ pressed, hovered }) => [themeStyle([styles.button, style]), { backgroundColor: palette.primary }, (unavailable || pressed || hovered) && { opacity: unavailable ? 0.5 : 0.85 }]}>
    {loading ? <ActivityIndicator size="small" color={palette.onPrimary} /> : <Text style={[styles.label, { color: palette.onPrimary }]}>{label}</Text>}
  </Pressable>
}
const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.oceanBlue },
  label: { fontFamily: 'DMSans', fontSize: 13, fontWeight: '700' },
})
