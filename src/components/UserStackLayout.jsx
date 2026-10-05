import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../theme/useAppTheme';
import NotificationHeader from './NotificationHeader';

// This notification header is outside the native header, so it must reserve its
// own space for the status bar and camera before rendering either element.
export default function UserStackLayout({ children }) {
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
    <NotificationHeader />
    {children}
  </View>;
}
