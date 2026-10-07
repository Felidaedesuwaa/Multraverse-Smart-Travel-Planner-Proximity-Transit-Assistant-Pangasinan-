import { Platform, Text, View } from 'react-native';
import { Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/useAppTheme';
import NotificationHeader from './NotificationHeader';
import { FeedbackPressable } from './WorkspaceMotion';

// One shared toolbar reserves the safe area for both navigation and notifications.
export default function UserStackLayout({ children, isWide, menuOpen, onOpenMenu }) {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const native = Platform.OS !== 'web';
  return <View style={{
    flex: 1,
    backgroundColor: palette.background,
    paddingTop: native ? insets.top + 8 : 0,
    paddingLeft: native ? insets.left : 0,
    paddingRight: native ? insets.right : 0,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: 56, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.line }}>
      {!isWide && <FeedbackPressable accessibilityRole="button" accessibilityLabel="Open navigation menu" accessibilityState={{ expanded: menuOpen }} onPress={onOpenMenu} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Menu size={24} color={palette.ink} /></FeedbackPressable>}
      <Text style={{ flex: 1, color: palette.ink, fontSize: 18, fontWeight: '700', paddingHorizontal: 8 }}>Multraverse</Text>
      <NotificationHeader compact />
    </View>
    {children}
  </View>;
}
