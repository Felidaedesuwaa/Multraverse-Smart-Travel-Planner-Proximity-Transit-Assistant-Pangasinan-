import { useEffect, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize2, Minimize2 } from 'lucide-react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import { useAppTheme } from '../theme/useAppTheme';

export default function FullscreenMap({ children, height, style, onLayout, fullscreen: controlled, onFullscreenChange, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const fullscreen = controlled ?? expanded;
  const toggle = value => { setExpanded(value); onFullscreenChange?.(value); };
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  useEffect(() => {
    if (Platform.OS !== 'web' || !fullscreen) return;
    const escape = event => { if (event.key === 'Escape') toggle(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [fullscreen]);
  const Icon = fullscreen ? Minimize2 : Maximize2;
  const map = <View onLayout={onLayout} style={[style, { height: fullscreen ? undefined : height, flex: fullscreen ? 1 : undefined, overflow: 'hidden' }]}>
    {children}
    <FeedbackPressable lift={false} accessibilityRole="button" accessibilityLabel={fullscreen ? 'Exit fullscreen map' : 'Open fullscreen map'} onPress={() => toggle(!fullscreen)} style={{ position: 'absolute', zIndex: 10, right: 12, top: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }}><Icon size={22} color={palette.ink} /></FeedbackPressable>
  </View>;
  return <>
    {fullscreen ? <View style={{ height }} /> : map}
    <Modal visible={fullscreen} animationType="fade" onRequestClose={() => toggle(false)} onDismiss={onDismiss}>
      <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }}>{fullscreen && map}</View>
    </Modal>
  </>;
}
