import { useState } from 'react';
import { LogOut } from 'lucide-react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import { useAppTheme } from '../theme/useAppTheme';
import { useAuthStore } from '../store/authStore';
import LogoutConfirmationDialog from './LogoutConfirmationDialog';

export default function SidebarLogoutButton() {
  const { isDark } = useAppTheme();
  const logout = useAuthStore(state => state.logout);
  const [confirm, setConfirm] = useState(false);
  return <>
    <FeedbackPressable accessibilityRole="button" accessibilityLabel="Log out" onPress={() => setConfirm(true)}
      style={({ pressed, hovered }) => ({ width: 44, height: 44, flexShrink: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#4A2933' : '#FCE8E8', opacity: pressed || hovered ? 0.8 : 1 })}>
      <LogOut size={18} color={isDark ? '#FDA4AF' : '#A94450'} />
    </FeedbackPressable>
    {confirm && <LogoutConfirmationDialog onCancel={() => setConfirm(false)} onConfirm={logout} />}
  </>;
}
