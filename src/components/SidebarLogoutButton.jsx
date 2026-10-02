import { useState } from 'react';
import { LogOut } from 'lucide-react-native';
import { Platform, Pressable } from 'react-native';
import { useAuthStore } from '../store/authStore';
import LogoutConfirmationDialog from './LogoutConfirmationDialog';

export default function SidebarLogoutButton() {
  const logout = useAuthStore(state => state.logout);
  const [confirm, setConfirm] = useState(false);
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Log out" onPress={() => setConfirm(true)}
      style={[{ width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 0 }, Platform.OS === 'web' && { outlineStyle: 'none' }]}>
      {({ pressed, hovered, focused }) => <LogOut size={18} color={pressed || hovered || focused ? '#F87171' : '#FDA4AF'} />}
    </Pressable>
    {confirm && <LogoutConfirmationDialog onCancel={() => setConfirm(false)} onConfirm={logout} />}
  </>;
}
