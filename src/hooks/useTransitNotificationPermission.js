import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { getTransitNotificationPermission, hasTransitNotificationPermission, openTransitNotificationSettings, requestTransitNotificationPermission } from '../lib/transitAlerts';

export function useTransitNotificationPermission() {
  const focused = useIsFocused();
  const [permission, setPermission] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const mounted = useRef(false), revision = useRef(0), requesting = useRef(false);
  const refresh = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const run = ++revision.current;
    try {
      const next = await getTransitNotificationPermission();
      if (mounted.current && run === revision.current) { setPermission(next); setError(''); }
      return next;
    } catch {
      if (mounted.current && run === revision.current) { setPermission(null); setError('Unable to check notification permission. Tap to retry.'); }
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { mounted.current = false; revision.current++; subscription.remove(); };
  }, [refresh]);
  useEffect(() => { if (focused) refresh(); }, [focused, refresh]);
  const requestAccess = useCallback(async () => {
    if (requesting.current || Platform.OS === 'web') return;
    requesting.current = true; setBusy(true); setError('');
    try {
      const current = await refresh();
      if (!current || hasTransitNotificationPermission(current)) return;
      if (current.canAskAgain === false) await openTransitNotificationSettings();
      else await requestTransitNotificationPermission();
      await refresh();
    } catch {
      if (mounted.current) setError('Unable to open notification settings. Enable notifications in your phone settings.');
    } finally { requesting.current = false; if (mounted.current) setBusy(false); }
  }, [refresh]);
  return { blocked: Platform.OS !== 'web' && (!permission || !hasTransitNotificationPermission(permission)), denied: !!permission && !hasTransitNotificationPermission(permission), busy, error, refresh, requestAccess };
}
