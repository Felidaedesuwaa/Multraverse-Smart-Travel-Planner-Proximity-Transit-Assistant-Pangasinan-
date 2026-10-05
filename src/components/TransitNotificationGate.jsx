import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';

export default function TransitNotificationGate({ access, children }) {
  if (!access?.blocked) return children;
  return <View style={{ minHeight: 120 }}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ opacity: 0.2 }}>{children}</View>
    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.72)', borderRadius: 12 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Turn on push notifications in Multraverse to use this feature." accessibilityState={{ disabled: access.busy, busy: access.busy }} disabled={access.busy} onPress={access.requestAccess}
        style={({ pressed }) => ({ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: 'transparent', opacity: pressed ? 0.75 : 1 })}>
        <Bell size={20} color="#FFFFFF" accessible={false} />
        <Text style={{ color: '#FFFFFF', fontSize: 14, lineHeight: 20, textAlign: 'center', fontWeight: '600' }}>Turn on push notifications in Multraverse to use this feature.</Text>
      </Pressable>
    </View>
    {!!access.error && <Text accessibilityRole="alert" style={{ color: '#FFFFFF', backgroundColor: '#333333', padding: 8 }}>{access.error}</Text>}
  </View>;
}
