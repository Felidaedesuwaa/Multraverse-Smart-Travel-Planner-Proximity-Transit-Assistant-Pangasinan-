import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { FeedbackPressable } from './WorkspaceMotion'
import { useAppTheme } from '../theme/useAppTheme'

export function WorkspaceButton({ label, icon: Icon, onPress, disabled, loading, primary, tone }) {
  const { palette: p } = useAppTheme()
  const background = tone === 'danger' ? '#DC2626' : tone === 'edit' ? '#2563EB' : primary ? p.primary : null
  const color = background ? '#FFFFFF' : p.ink
  return <FeedbackPressable accessibilityRole="button" accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }} disabled={disabled || loading} onPress={onPress} style={({ hovered, pressed }) => [ui.button, { backgroundColor: background || ((hovered || pressed) ? p.tint : p.surface), borderColor: background || p.line, opacity: disabled || loading ? 0.6 : 1 }]}>
    {loading ? <ActivityIndicator size="small" color={color} /> : Icon ? <Icon size={17} color={color} /> : null}<Text style={[ui.buttonText, { color }]}>{label}</Text>
  </FeedbackPressable>
}
export function WorkspacePage({ title, subtitle, actions, children }) {
  const { palette: p } = useAppTheme()
  const { width } = useWindowDimensions()
  return <ScrollView style={{ flex: 1, backgroundColor: p.background }} contentContainerStyle={{ flexGrow: 1, padding: width < 768 ? 18 : 32 }}><View style={ui.container}>
    <View style={ui.header}><View style={{ flexGrow: 1, flexShrink: 1, gap: 6 }}><Text style={[ui.eyebrow, { color: p.muted }]}>SUPER ADMIN WORKSPACE</Text><Text style={[ui.title, { color: p.ink }]}>{title}</Text><Text style={[ui.body, { color: p.muted }]}>{subtitle}</Text></View>{actions}</View>{children}
  </View></ScrollView>
}
export function WorkspacePanel({ children, style }) {
  const { palette: p } = useAppTheme()
  return <View style={[ui.panel, { backgroundColor: p.surface, borderColor: p.line }, style]}>{children}</View>
}
export function WorkspaceTable({ columns, rows, empty = 'No matching records.', renderActions }) {
  const { palette: p } = useAppTheme()
  if (!rows.length) return <View style={ui.empty}><Text style={[ui.body, { color: p.muted }]}>{empty}</Text></View>
  return <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}><View style={{ flexGrow: 1 }}>
    <View style={[ui.tableRow, { backgroundColor: p.tint }]}>{columns.map((label, index) => <Text key={label} style={[ui.cell, ui.eyebrow, { width: index === 0 ? 260 : 220, color: p.muted }]}>{label.toUpperCase()}</Text>)}{renderActions && <Text style={[ui.cell, ui.eyebrow, { width: 230, color: p.muted }]}>ACTIONS</Text>}</View>
    {rows.map(row => <View key={row.id} style={[ui.tableRow, { borderBottomWidth: 1, borderColor: p.line }]}>{row.cells.map((value, index) => <Text key={index} selectable style={[ui.cell, ui.body, { width: index === 0 ? 260 : 220, color: p.ink }]}>{value}</Text>)}{renderActions && <View style={[ui.cell, { width: 230 }]}>{renderActions(row)}</View>}</View>)}
  </View></ScrollView>
}
export const ui = StyleSheet.create({
  container: { width: '100%', maxWidth: 1440, alignSelf: 'center', gap: 24 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 },
  title: { fontFamily: 'Poppins', fontSize: 28, fontWeight: '700' },
  eyebrow: { fontFamily: 'DMSans', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  body: { fontFamily: 'DMSans', fontSize: 14, lineHeight: 22 },
  heading: { fontFamily: 'Poppins', fontSize: 17, fontWeight: '600' },
  caption: { fontFamily: 'DMSans', fontSize: 12, lineHeight: 19 },
  panel: { padding: 22, borderRadius: 16, borderWidth: 1, gap: 20, minWidth: 0 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, minHeight: 44 },
  buttonText: { fontFamily: 'DMSans', fontSize: 13, fontWeight: '700' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 13, minHeight: 48, fontFamily: 'DMSans', fontSize: 14 },
  tableRow: { flexDirection: 'row', alignItems: 'center' },
  cell: { paddingHorizontal: 16, paddingVertical: 18 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 12 },
})
