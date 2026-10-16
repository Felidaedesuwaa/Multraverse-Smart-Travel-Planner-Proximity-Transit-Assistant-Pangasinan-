import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, RefreshCw, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { getArrivalNotices, subscribeNotifications } from '../lib/notificationEvents';
import { useAuthStore } from '../store/authStore';
import { useAppTheme } from '../theme/useAppTheme';
import { FeedbackPressable } from './WorkspaceMotion';

export default function NotificationHeader({ compact = false } = {}) {
  const { palette: p } = useAppTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const ownerId = useAuthStore(state => state.user?.id);
  const role = useAuthStore(state => state.user?.role);
  const [open, setOpen] = useState(false), [items, setItems] = useState([]), [seen, setSeen] = useState([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState('');
  const [seenLoaded, setSeenLoaded] = useState(false);
  const current = useRef(0), controller = useRef(null), seenReady = useRef(false);
  const refresh = useCallback(async () => {
    if (!ownerId) return;
    const revision = ++current.current;
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    const timeout = setTimeout(() => request.abort(), 15000);
    setLoading(true);
    const results = await Promise.allSettled([api.getNotifications(request.signal), getArrivalNotices(ownerId)]);
    clearTimeout(timeout);
    if (revision !== current.current) return;
    const [remote, local] = results;
    const arrivals = local.status === 'fulfilled' ? local.value : [];
    if (remote.status === 'fulfilled') {
      setItems([...remote.value, ...arrivals].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 150)); setError('');
    } else {
      setItems(previous => [...previous.filter(item => item.type !== 'arrival'), ...arrivals]);
      setError('Updates could not be refreshed. Tap Refresh to retry.');
    }
    setLoading(false);
  }, [ownerId]);
  useEffect(() => {
    let alive = true;
    setItems([]); setSeen([]); setSeenLoaded(false); seenReady.current = false;
    AsyncStorage.getItem(`notifications:seen:${ownerId}`).then(value => {
      if (alive) { try { const ids = JSON.parse(value); setSeen(Array.isArray(ids) ? ids : []); } catch { setSeen([]); } seenReady.current = true; setSeenLoaded(true); }
    }).catch(() => { if (alive) { seenReady.current = true; setSeenLoaded(true); } });
    refresh();
    const unsubscribe = subscribeNotifications(refresh);
    const timer = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 30000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { alive = false; current.current++; controller.current?.abort(); clearInterval(timer); unsubscribe(); listener.remove(); };
  }, [ownerId, refresh]);
  const markRead = ids => {
    if (!seenReady.current) return;
    setSeen(previous => {
      const next = [...new Set([...previous, ...ids])].slice(-1000);
      AsyncStorage.setItem(`notifications:seen:${ownerId}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  const unread = items.filter(item => !seen.includes(item.id)).length;
  const allRead = items.length > 0 && unread === 0;
  const bulkDisabled = !items.length || !seenLoaded;
  const bulkLabel = allRead ? 'Mark all as unread' : 'Mark all as read';
  const toggleAllRead = () => {
    if (bulkDisabled) return;
    if (!allRead) { markRead(items.map(item => item.id)); return; }
    const ids = new Set(items.map(item => item.id));
    setSeen(previous => {
      const next = previous.filter(id => !ids.has(id));
      AsyncStorage.setItem(`notifications:seen:${ownerId}`, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };
  const choose = item => {
    markRead([item.id]); setOpen(false);
    if (item.screen === 'PasswordRecovery') navigation.navigate('PasswordRecovery');
    else if (role === 'LGU') navigation.navigate('LGU');
    else if (role === 'ADMIN') navigation.navigate('Admin', { screen: item.type === 'review' ? 'AdminApprovals' : 'AdminDashboard' });
    else if (role === 'SUPERADMIN') navigation.navigate('SuperAdmin', { screen: item.type === 'review' ? 'SuperAdminAuditLog' : 'SuperAdminDashboard' });
    else if (!['ADMIN', 'SUPERADMIN'].includes(role)) navigation.navigate('User', { screen: item.screen });
  };
  return <View style={compact ? { alignItems: 'flex-end' } : { backgroundColor: p.surface, borderBottomWidth: 1, borderColor: p.line, paddingHorizontal: 16, paddingVertical: 4, alignItems: 'flex-end' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Notifications, ${unread} unread`} accessibilityState={{ expanded: open }} onPress={() => { setOpen(true); refresh(); }} style={styles.bell}>
      <Bell size={24} color={p.ink} />
      {unread > 0 && <View style={[styles.badge, { backgroundColor: p.primary }]}><Text style={{ color: p.onPrimary, fontSize: 10, fontWeight: '700' }}>{unread > 99 ? '99+' : unread}</Text></View>}
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={[styles.overlay, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={StyleSheet.absoluteFillObject} accessibilityLabel="Close notifications" onPress={() => setOpen(false)} />
        <View accessibilityViewIsModal style={[styles.panel, { backgroundColor: p.surface }]}>
          <View style={styles.row}><Text accessibilityRole="header" style={{ color: p.ink, fontSize: 22, fontWeight: '700', flex: 1 }}>Notifications</Text><Pressable accessibilityRole="button" accessibilityLabel="Close notifications" onPress={() => setOpen(false)} style={styles.bell}><X color={p.ink} size={22} /></Pressable></View>
          <View style={[styles.row, styles.toolbar]}>
            <Text accessibilityLiveRegion="polite" style={{ color: p.muted, flex: 1 }}>{unread} unread</Text>
            <FeedbackPressable lift accessibilityRole="button" accessibilityLabel="Refresh notifications" accessibilityState={{ disabled: loading, busy: loading }} onPress={refresh} disabled={loading} style={({ hovered, pressed }) => [styles.action, styles.refresh, { backgroundColor: (hovered || pressed) && !loading ? p.tint : p.background, opacity: loading ? 0.5 : 1 }]}>
              {loading ? <ActivityIndicator size="small" color={p.primary} /> : <RefreshCw size={20} color={p.ink} />}
            </FeedbackPressable>
            <FeedbackPressable lift accessibilityRole="button" accessibilityLabel={bulkLabel} accessibilityState={{ disabled: bulkDisabled }} onPress={toggleAllRead} disabled={bulkDisabled} style={({ hovered, pressed }) => [styles.action, { backgroundColor: (hovered || pressed) && !bulkDisabled ? p.tint : p.background, opacity: bulkDisabled ? 0.4 : allRead ? 0.65 : 1 }]}>
              <Text style={{ color: allRead || bulkDisabled ? p.muted : p.ink, fontWeight: '600', fontSize: 13 }}>{bulkLabel}</Text>
            </FeedbackPressable>
          </View>
          {!!error && <Text accessibilityRole="alert" style={{ color: p.ink, paddingBottom: 12 }}>{error}</Text>}
          <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
            {!items.length && <Text style={{ color: p.muted, paddingVertical: 16 }}>{loading ? 'Loading updates…' : 'No notifications yet.'}</Text>}
            {items.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => choose(item)} style={{ padding: 14, borderRadius: 12, gap: 6, backgroundColor: seen.includes(item.id) ? p.background : p.tint, borderColor: p.line, borderWidth: 1 }}>
              <Text style={{ color: p.ink, fontWeight: '700', fontSize: 15 }}>{item.title}{!seen.includes(item.id) ? ' •' : ''}</Text>
              <Text style={{ color: p.ink, fontSize: 13, lineHeight: 20 }}>{item.message}</Text>
              <Text style={{ color: p.muted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</Text>
              {item.type === 'password' && <Text style={{ color: p.ink, fontWeight: '700' }}>Wasn’t you? Secure your account →</Text>}
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  bell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 2, right: 0, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: '#00000066', padding: 16, alignItems: 'center', justifyContent: 'center' },
  panel: { width: '100%', maxWidth: 560, height: '90%', borderRadius: 20, padding: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toolbar: { flexWrap: 'wrap', gap: 8, paddingBottom: 12 },
  action: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
  refresh: { width: 44, paddingHorizontal: 0 },
});
