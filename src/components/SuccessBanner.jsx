import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, X } from 'lucide-react-native';

export default function SuccessBanner({ message, onDismiss }) {
  if (!message) return null;
  return <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}>
    <CheckCircle2 size={22} color="#215C36" accessible={false} />
    <Text style={styles.message}>{message}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={onDismiss} style={styles.dismiss}>
      <X size={18} color="#215C36" accessible={false} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  banner: { marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#B4DCC0', backgroundColor: '#DDF6E3', flexDirection: 'row', alignItems: 'center', gap: 10 },
  message: { flex: 1, color: '#215C36', fontSize: 14, lineHeight: 22, fontWeight: '600' },
  dismiss: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
