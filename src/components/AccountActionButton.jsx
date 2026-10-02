import { Pressable, StyleSheet } from 'react-native'
import { Pencil, Trash2 } from 'lucide-react-native'
import { useAppTheme } from '../theme/useAppTheme'

export default function AccountActionButton({ mode, label, onPress, disabled = false }) {
  const deleting = mode === 'delete'
  const { palette } = useAppTheme()
  const background = deleting ? (palette.dark ? '#54383B' : '#F5DEDA') : (palette.dark ? '#294959' : '#DCEAF4')
  const foreground = deleting ? (palette.dark ? '#E9ABA2' : '#A6574A') : (palette.dark ? '#A7C9E9' : '#416D94')
  const Icon = deleting ? Trash2 : Pencil
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed, hovered }) => [styles.button, { backgroundColor: background, opacity: disabled ? 0.4 : pressed || hovered ? 0.8 : 1 }]}>
    <Icon size={15} color={foreground} />
  </Pressable>
}
const styles = StyleSheet.create({ button: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' } })
