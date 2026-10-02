import { useState } from 'react'
import { Modal, ScrollView, Text, View } from 'react-native'
import { Check, ChevronDown } from 'lucide-react-native'
import { FeedbackPressable } from './WorkspaceMotion'
import { WorkspaceButton, ui } from './SuperAdminWorkspace'
import { useAppTheme } from '../theme/useAppTheme'
export default function SuperAdminSelect({ label, value, options, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const { palette: p } = useAppTheme()
  return <View style={{ gap: 8 }}>
    <Text style={[ui.buttonText, { color: p.ink }]}>{label}</Text>
    <FeedbackPressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open, disabled: !!disabled }} onPress={() => setOpen(true)} style={[ui.input, { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: p.line, backgroundColor: p.background, opacity: disabled ? 0.5 : 1 }]}><Text style={[ui.body, { color: p.ink, flex: 1 }]}>{options.find(option => option.value === value)?.label || 'Select an option'}</Text><ChevronDown size={16} color={p.muted} /></FeedbackPressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View accessibilityViewIsModal style={{ backgroundColor: p.surface, width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '80%', padding: 20, borderRadius: 16, gap: 16 }}>
          <Text style={[ui.heading, { color: p.ink }]}>{label}</Text>
          <ScrollView>{options.map(option => <FeedbackPressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => { onChange(option.value); setOpen(false) }} style={({ hovered, pressed }) => ({ padding: 14, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: hovered || pressed || option.value === value ? p.tint : 'transparent' })}><Text style={[ui.body, { color: p.ink, flex: 1 }]}>{option.label}</Text>{option.value === value && <Check size={16} color={p.ink} />}</FeedbackPressable>)}</ScrollView>
          <WorkspaceButton label="Cancel" onPress={() => setOpen(false)} />
        </View>
      </View>
    </Modal>
  </View>
}
