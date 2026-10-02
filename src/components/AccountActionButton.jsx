import { Pressable, StyleSheet } from 'react-native'
import { Pencil, Trash2 } from 'lucide-react-native'

export default function AccountActionButton({ mode, label, onPress, disabled = false }) {
  const deleting = mode === 'delete'
  const Icon = deleting ? Trash2 : Pencil
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed, hovered }) => [styles.button, { backgroundColor: deleting ? '#DC2626' : '#2563EB', opacity: disabled ? 0.4 : pressed || hovered ? 0.8 : 1 }]}>
    <Icon size={19} color="#FFFFFF" />
  </Pressable>
}
const styles = StyleSheet.create({ button: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' } })
