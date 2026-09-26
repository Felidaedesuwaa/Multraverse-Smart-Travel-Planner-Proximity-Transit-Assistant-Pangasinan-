import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useAppTheme } from '../theme/useAppTheme'

export default function SuperAdminToast({ message, onDismiss }) {
  const { text, surface } = useAppTheme()
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [message, onDismiss])
  if (!message) return null
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={{ padding: 16, borderRadius: 12, backgroundColor: surface, borderWidth: 1, borderColor: text, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
    <Text style={{ color: text, flex: 1 }}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={onDismiss}><Text style={{ color: text }}>Dismiss</Text></Pressable>
  </View>
}
