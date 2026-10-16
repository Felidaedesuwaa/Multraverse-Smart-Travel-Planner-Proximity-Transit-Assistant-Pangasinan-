import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../theme/useAppTheme';

export default function PendingReviewBadge({ count, showZero = false, inverse = false }) {
  const { palette } = useAppTheme();
  if (!count && !showZero) return null;
  return <View style={[styles.badge, { backgroundColor: inverse ? palette.button : palette.primary }]}>
    <Text style={{ color: inverse ? palette.onButton : palette.onPrimary, fontSize: 11, fontWeight: '700' }}>{count}</Text>
  </View>;
}
const styles = StyleSheet.create({
  badge: { minWidth: 22, minHeight: 22, flexShrink: 0, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
