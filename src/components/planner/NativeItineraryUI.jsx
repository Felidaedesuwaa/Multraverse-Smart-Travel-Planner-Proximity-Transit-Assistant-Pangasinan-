import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, ChevronDown, MapPin, X } from 'lucide-react-native';
import { useAppTheme } from '../../theme/useAppTheme';

export const money = value => value == null || !Number.isFinite(Number(value)) ? 'Pending' : `PHP ${Number(value).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
export const range = (min, max) => min === max ? money(min) : `${money(min)} – ${money(max)}`;
export const toggle = (values, value) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
export const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48, gap: 18, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  card: { padding: 18, borderWidth: 1, borderRadius: 16, gap: 14 },
  body: { fontFamily: 'DMSans', fontSize: 14, lineHeight: 22 },
  heading: { fontFamily: 'Poppins', fontSize: 20, lineHeight: 28 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, fontFamily: 'DMSans', fontSize: 16 },
  button: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 1 },
});

export function Copy({ children, heading = false, muted = false, alert = false }) {
  const { palette } = useAppTheme();
  return <Text accessibilityRole={alert ? 'alert' : heading ? 'header' : undefined} style={[heading ? styles.heading : styles.body, { color: alert ? palette.accent : muted ? palette.muted : palette.ink }]}>{children}</Text>;
}
export function Card({ children }) {
  const { palette } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>{children}</View>;
}
export function Button({ children, onPress, selected = false, disabled = false, primary = false, label, Icon, TrailingIcon, busy = false }) {
  const { palette } = useAppTheme();
  const filled = selected || primary;
  const color = filled ? palette.onPrimary : palette.ink;
  const EndIcon = TrailingIcon || (selected ? Check : null);
  return <Pressable accessibilityRole="button" accessibilityLabel={label || (typeof children === 'string' ? children : undefined)} accessibilityState={{ selected, disabled, busy }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, { borderColor: filled ? palette.primary : palette.line, backgroundColor: filled ? palette.primary : palette.paper, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}>
    {!!Icon && <Icon size={18} color={color} accessible={false} />}
    <Text style={[styles.body, { color, flexShrink: 1 }]}>{children}</Text>
    {!!EndIcon && <EndIcon size={16} color={color} accessible={false} />}
  </Pressable>;
}
export function Field({ label, value, onChange, numeric = false, error, placeholder, onFocus }) {
  const { palette } = useAppTheme();
  return <View style={{ gap: 6 }}><Copy>{label}</Copy><TextInput accessibilityLabel={label} accessibilityHint={error || placeholder} placeholder={placeholder} placeholderTextColor={palette.muted} value={String(value ?? '')} onChangeText={onChange} onFocus={onFocus} autoCapitalize="none" keyboardType={numeric ? 'decimal-pad' : 'default'} style={[styles.input, { color: palette.ink, backgroundColor: palette.surface, borderColor: error ? palette.accent : palette.line }]} />{!!error && <Copy alert>{error}</Copy>}</View>;
}
export function Choices({ label, options, values, onChange, multiple = false, limit, error }) {
  return <View style={{ gap: 8 }}><Copy>{label}</Copy>{!!limit && <Copy muted>Choose up to {limit} favorites ({values.length} selected).</Copy>}<View style={styles.row}>{options.map(option => {
    const item = typeof option === 'string' ? { id: option, label: option } : option;
    const selected = multiple ? values.includes(item.id) : values === item.id;
    return <Button key={String(item.id)} Icon={item.Icon} selected={selected} disabled={item.disabled || (multiple && !selected && !!limit && values.length >= limit)} onPress={() => onChange(multiple ? toggle(values, item.id) : item.id)}>{item.label}</Button>;
  })}</View>{!!error && <Copy alert>{error}</Copy>}</View>;
}
export function Select({ label, options, value, onChange, error, placeholder = 'Choose an option', searchable = false }) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find(option => option.id === value);
  const matches = options.filter(option => option.label.toLowerCase().includes(query.trim().toLowerCase()));
  return <View style={{ gap: 6 }}>
    <Copy>{label}</Copy>
    <Button label={label} Icon={searchable ? MapPin : selected?.Icon} TrailingIcon={ChevronDown} onPress={() => { setQuery(''); setOpen(true); }}>{selected?.label || placeholder}</Button>
    {!!error && <Copy alert>{error}</Copy>}
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
      {/* Modals have a separate native root. Seed its insets before the first
          layout event, including when the presenting screen consumes the top inset. */}
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width, height }, insets: {
        ...insets, top: Math.max(insets.top, initialWindowMetrics?.insets.top || 0), bottom: Math.max(insets.bottom, initialWindowMetrics?.insets.bottom || 0),
      } }}>
        <SelectSheet label={label} onClose={() => setOpen(false)}>
          {searchable && <Field label={`Search ${label.toLowerCase()}`} value={query} onChange={setQuery} placeholder="Search..." />}
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {matches.map(option => {
              const active = option.id === value, Icon = option.Icon;
              return <Pressable key={String(option.id)} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ selected: active }} onPress={() => { onChange(option.id); setOpen(false); }}
                style={({ pressed }) => ({ minHeight: 54, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: active ? palette.primary : palette.line, backgroundColor: active ? palette.tint : palette.paper, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}>
                {!!Icon && <Icon size={20} color={palette.ink} accessible={false} />}
                <Text style={[styles.body, { flex: 1, color: palette.ink }]}>{option.label}</Text>
                {active && <Check size={20} color={palette.ink} accessible={false} />}
              </Pressable>;
            })}
            {!matches.length && <Copy muted>No matches. Try another name.</Copy>}
          </ScrollView>
        </SelectSheet>
      </SafeAreaProvider>
    </Modal>
  </View>;
}

function SelectSheet({ label, onClose, children }) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Close ${label}`} onPress={onClose} style={StyleSheet.absoluteFillObject} />
    <View pointerEvents="box-none" style={{ flex: 1, justifyContent: 'center', paddingTop: Math.max(insets.top, initialWindowMetrics?.insets.top || 0) + 16, paddingBottom: Math.max(insets.bottom, initialWindowMetrics?.insets.bottom || 0) + 16, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 560, maxHeight: '85%', alignSelf: 'center', padding: 18, gap: 14, borderRadius: 22, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 4 }}><Copy heading>{label}</Copy><Copy muted>Choose one option</Copy></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.paper, opacity: pressed ? 0.7 : 1 })}><X size={22} color={palette.ink} accessible={false} /></Pressable>
        </View>
        {children}
      </View>
    </View>
  </KeyboardAvoidingView>;
}
