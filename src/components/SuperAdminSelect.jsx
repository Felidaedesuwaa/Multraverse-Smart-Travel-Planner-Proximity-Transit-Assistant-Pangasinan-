import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useAppTheme } from '../theme/useAppTheme'

export default function SuperAdminSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const { text, surface } = useAppTheme()
  return <View style={{ gap: 8 }}>
    <Text style={{ color: text }}>{label}</Text>
    <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled }} onPress={() => setOpen(true)} style={{ padding: 14, borderWidth: 1, borderColor: text, borderRadius: 10 }}><Text style={{ color: text }}>{options.find(option => option.value === value)?.label || 'Select an option'} ?</Text></Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: surface, maxHeight: '80%', padding: 20, borderRadius: 14 }}>
          <Text style={{ color: text, fontSize: 18, marginBottom: 12 }}>{label}</Text>
          <ScrollView>{options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => { onChange(option.value); setOpen(false) }} style={{ padding: 14 }}><Text style={{ color: text }}>{option.label}</Text></Pressable>)}</ScrollView>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ padding: 14 }}><Text style={{ color: text }}>Cancel</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>
}
