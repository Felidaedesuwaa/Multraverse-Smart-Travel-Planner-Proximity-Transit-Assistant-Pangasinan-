import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../lib/api';
import { useAppTheme } from '../theme/useAppTheme';

export default function GeofenceTracking({ onEvents }) {
  const { palette } = useAppTheme();
  const [enabled, setEnabled] = useState(false), [message, setMessage] = useState('Enable GPS alerts to detect entry, exit and dwell in Pangasinan zones.');
  const [lastAlert, setLastAlert] = useState('');
  const run = useRef(0), listener = useRef(onEvents);
  listener.current = onEvents;
  useEffect(() => {
    if (!enabled) return;
    const id = ++run.current;
    let busy = false;
    async function tick() {
      if (busy || run.current !== id) return;
      busy = true;
      try {
        const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 15000 } : {}) });
        if (run.current !== id) return;
        if (fix.coords.accuracy == null) throw new Error('GPS accuracy is unavailable.');
        const result = await api.trackGeofences({ lat: fix.coords.latitude, lng: fix.coords.longitude, accuracy: fix.coords.accuracy, timestamp: fix.timestamp });
        if (run.current !== id) return;
        setMessage(result.events.length ? result.events.map(e => `${e.location}: ${e.type}${e.message ? ' — ' + e.message : ''}`).join(' · ') : result.insideProvince ? 'GPS monitoring active. Keep the app open for alerts.' : 'Outside Pangasinan. No zones are monitored here.');
        if (result.events.length) setLastAlert(result.events.map(e => `${e.location}: ${e.type}${e.message ? ' — ' + e.message : ''}`).join(' · '));
        if (result.events.length) listener.current?.(result.events);
      } catch (e) { if (run.current === id) setMessage(e.message || 'Location monitoring failed.'); }
      finally { busy = false; }
    }
    tick();
    const timer = setInterval(tick, 5000);
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') { run.current++; setEnabled(false); setMessage('GPS monitoring paused. Enable it again when the app is open.'); } });
    return () => { run.current++; clearInterval(timer); subscription.remove(); };
  }, [enabled]);
  async function toggle() {
    if (enabled) { run.current++; setEnabled(false); setMessage('GPS monitoring stopped.'); return; }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Allow location access to enable geofence alerts.');
      setEnabled(true);
    } catch (e) { setMessage(e.message); }
  }
  return <View style={{ padding: 14, gap: 8, backgroundColor: palette.surface, borderColor: palette.line, borderWidth: 1, borderRadius: 14, marginBottom: 16 }}>
    <Pressable accessibilityRole="button" onPress={toggle} style={{ alignSelf: 'flex-start', padding: 10, borderRadius: 20, backgroundColor: palette.tint }}><Text style={{ color: palette.ink, fontFamily: 'DMSans', fontWeight: '700' }}>{enabled ? 'Stop GPS alerts' : 'Enable GPS alerts'}</Text></Pressable>
    <Text accessibilityLiveRegion="polite" style={{ color: palette.muted, fontFamily: 'DMSans', fontSize: 12 }}>{message}</Text>
    {!!lastAlert && <Text accessibilityLiveRegion="assertive" style={{ color: palette.ink, fontFamily: 'DMSans', fontWeight: '700', fontSize: 13 }}>Latest alert: {lastAlert}</Text>}
  </View>;
}
