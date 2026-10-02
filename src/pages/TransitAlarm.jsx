import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Platform, ScrollView, StyleSheet, Text, Vibration, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { Bell, Bus, MapPin, Search, Vibrate, Volume2, Smartphone } from 'lucide-react-native';
import { FeedbackPressable } from '../components/WorkspaceMotion';
import AIToolHeader from '../components/AIToolHeader';
import Select from '../components/SuperAdminSelect';
import { useAppTheme } from '../theme/useAppTheme';
import { api } from '../lib/api';
import map from '../data/pangasinanMap.json';
import { distanceMeters, municipality, isArrival } from '../lib/transitGeometry';
import { startTransitAlarm, stopTransitAlarm, getTransitSession, subscribeTransit } from '../lib/transitTracking';
import { useAuthStore } from '../store/authStore';
import TransitStopPreview from '../components/TransitStopPreview';

const modes = [{ key: 'vibrate', label: 'Vibrate', Icon: Vibrate }, { key: 'sound', label: 'Sound', Icon: Volume2 }, { key: 'push', label: 'Notify', Icon: Smartphone }];

export default function TransitAlarm() {
  const { width } = useWindowDimensions();
  const compact = width < 1100;
  const { themeStyle: t, themeColor } = useAppTheme();
  const [from, setFrom] = useState('dagupan'), [to, setTo] = useState('alaminos');
  const [routes, setRoutes] = useState([]), [route, setRoute] = useState(null), [stopIndex, setStopIndex] = useState(0);
  const [radius, setRadius] = useState(500), [mode, setMode] = useState('vibrate');
  const [alarm, setAlarm] = useState(false), [tracking, setTracking] = useState(false), [busyGPS, setBusyGPS] = useState(false);
  const [position, setPosition] = useState(null), [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false), [searched, setSearched] = useState(false), [message, setMessage] = useState('');
  const watcher = useRef(null), generation = useRef(0), requestId = useRef(0), audio = useRef(null);
  const background = useRef(false), fired = useRef(false);
  const [arming, setArming] = useState(false);
  const target = route?.stops[stopIndex];
  const fresh = position && now - position.timestamp < 30000;
  const accurate = fresh && position.coords.accuracy != null && position.coords.accuracy <= Math.min(100, radius / 2);
  const options = map.areas.map(a => ({ value: a.id, label: a.name }));
  const disarm = () => { if (background.current && !watcher.current) setTracking(false); background.current = false; fired.current = true; setAlarm(false); stopTransitAlarm().catch(() => setMessage('Could not stop background tracking. Retry Stop Tracking.')); };
  const halt = () => { generation.current++; watcher.current?.remove(); watcher.current = null; setTracking(false); disarm(); };
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    let mounted = true;
    const restore = session => {
      if (!mounted) return;
      if (!session && Platform.OS !== 'web') {
        if (background.current && !watcher.current) setTracking(false);
        background.current = false; setAlarm(false); return;
      }
      if (session?.ownerId !== useAuthStore.getState().user?.id) return;
      if (!session.active) { generation.current++; watcher.current?.remove(); watcher.current = null; }
      background.current = !!session.active;
      setRoute(session.route); setStopIndex(session.stopIndex); setRadius(session.radius); setMode(session.mode);
      setAlarm(!!session.active); setTracking(!!session.active);
      if (session.message) setMessage(session.message);
    };
    const unsubscribe = subscribeTransit(restore);
    getTransitSession().then(restore).catch(() => setMessage('Unable to restore trip alarm. Check location settings.'));
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') getTransitSession().then(restore).catch(() => {});
      else if (Platform.OS === 'web') { halt(); setMessage('Web tracking paused. Keep this page open and resume tracking for alerts.'); }
    });
    return () => { mounted = false; clearInterval(timer); unsubscribe(); subscription.remove(); generation.current++; watcher.current?.remove(); audio.current?.close(); };
  }, []);
  async function gps(useOrigin = false) {
    const run = ++generation.current;
    watcher.current?.remove(); watcher.current = null;
    disarm(); setTracking(false); setBusyGPS(true); setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Allow location access to track your route.');
      const update = p => {
        if (generation.current !== run) return;
        const area = municipality(p.coords);
        if (!area) { halt(); setPosition(null); setMessage('Your GPS location is outside Pangasinan. Transit tracking is unavailable here.'); return; }
        setPosition(p); setNow(Date.now());
      };
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (generation.current !== run) return;
      if (!municipality(p.coords)) throw new Error('Your GPS location is outside Pangasinan.');
      update(p);
      if (useOrigin) { changeEndpoint('from', municipality(p.coords)); return; }
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 }, update, () => { halt(); setMessage('GPS tracking failed. Check location services and resume tracking.'); });
      if (generation.current !== run) subscription.remove();
      else { watcher.current = subscription; setTracking(true); }
    } catch (e) { if (generation.current === run) { halt(); setMessage(e.message || 'Unable to obtain GPS location.'); } }
    finally { setBusyGPS(false); }
  }
  function changeEndpoint(which, value) {
    requestId.current++; halt(); setRoute(null); setRoutes([]); setSearched(false); setLoading(false);
    (which === 'from' ? setFrom : setTo)(value);
  }
  async function findRoutes() {
    const id = ++requestId.current;
    halt(); setRoute(null); setRoutes([]); setLoading(true); setMessage(''); setSearched(true);
    try {
      if (from === to) throw new Error('Choose two different Pangasinan municipalities.');
      const data = await api.searchTransitRoutes({ from, to });
      if (id === requestId.current) setRoutes(data.routes.filter(r => r.stops.every(s => municipality(s) === s.areaId)));
    } catch (e) { if (id === requestId.current) setMessage(e.message); }
    finally { if (id === requestId.current) setLoading(false); }
  }
  function choose(r) { halt(); setRoute(r); setStopIndex(r.stops.length - 1); setMessage('Route selected. Choose a stop, then enable its alarm.'); }
  async function enable() {
    if (alarm) { halt(); return; }
    if (arming) return;
    if (!target || !tracking || !accurate) { setMessage('Track the route and wait for a fresh, accurate Pangasinan GPS fix before enabling the alarm.'); return; }
    try {
      setArming(true);
      if (Platform.OS !== 'web') {
        setMessage('Allow notifications and background location (“all the time”) to check this stop while your phone is locked.');
        await startTransitAlarm({ ownerId: useAuthStore.getState().user?.id, route, stopIndex, radius, mode });
        background.current = true; setAlarm(true); setMessage('Background alarm enabled for this trip (up to 8 hours). Keep location and notifications enabled.');
        return;
      }
      if (mode === 'push') {
        if (Platform.OS !== 'web' || !globalThis.Notification) throw new Error('Push alerts are available in supported web browsers. Choose Vibrate on mobile.');
        if (await globalThis.Notification.requestPermission() !== 'granted') throw new Error('Notification permission was denied.');
      }
      if (mode === 'sound') {
        const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (Platform.OS !== 'web' || !AudioContext) throw new Error('Sound alerts are available in supported web browsers. Choose Vibrate on mobile.');
        audio.current ||= new AudioContext(); await audio.current.resume();
      }
      fired.current = false; setAlarm(true); setMessage('Alarm enabled. Keep this page open.');
    } catch (e) { setMessage(e.message); }
    finally { setArming(false); }
  }
  useEffect(() => {
    if (Platform.OS !== 'web' || fired.current || !alarm || !target || !tracking || !isArrival(position, target, radius)) return;
    fired.current = true;
    setAlarm(false);
    const text = `Approaching ${target.name}. Your stop is within ${radius} m.`;
    setMessage(text);
    if (mode === 'vibrate') Vibration.vibrate([0, 700, 250, 700]);
    if (mode === 'push') new globalThis.Notification('Transit stop alert', { body: text });
    if (mode === 'sound' && audio.current) {
      const oscillator = audio.current.createOscillator(); oscillator.connect(audio.current.destination); oscillator.frequency.value = 880; oscillator.start(); oscillator.stop(audio.current.currentTime + 1.5);
    }
    Alert.alert('Your stop is approaching', text);
  }, [alarm, target, tracking, accurate, position, radius, mode]);
  function button(label, onPress, Icon = MapPin, secondary = false, disabled = false) {
    return <FeedbackPressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={t([styles.button, secondary && styles.secondary, disabled && { opacity: 0.45 }])}><Icon size={14} color={secondary ? themeColor('#103E53', 'color') : '#fff'} /><Text style={t([styles.buttonText, secondary && { color: '#103E53' }])}>{label}</Text></FeedbackPressable>;
  }
  return <ScrollView style={t(styles.container)} contentContainerStyle={t([styles.screen, compact && { padding: 16 }])}>
    <AIToolHeader eyebrow="PANGASINAN TRANSIT COMPANION" title="Transit Alarm" subtitle="Get proximity alerts for active Pangasinan transit routes." badges={[{ label: 'Active route data' }, { label: 'Location-aware alerts' }, { label: 'Smart notifications', color: '#A78BFA' }]} Icon={Bell} />
    <View style={t([styles.columns, compact && { flexDirection: 'column' }])}>
      <View style={{ flex: 1, gap: 16, width: '100%' }}>
        <View style={t(styles.card)}><Text style={t(styles.title)}>Plan Your Route</Text>
          <View style={styles.row}><View style={{ flex: 1 }}><Select label="From" value={from} options={options} onChange={v => changeEndpoint('from', v)} /></View><View style={{ flex: 1 }}><Select label="To" value={to} options={options} onChange={v => changeEndpoint('to', v)} /></View></View>
          {button(busyGPS ? 'Locating…' : 'Use my GPS location', () => gps(true), MapPin, true, busyGPS)}
          {button(loading ? 'Finding routes…' : 'Find Routes', findRoutes, Search, false, loading)}
        </View>
        <Text style={t(styles.title)}>Available Routes</Text>
        {loading && <ActivityIndicator />}
        {searched && !loading && !routes.length && <View style={t(styles.card)}><Text style={t(styles.muted)}>No sourced, coordinate-backed transit route is published for this journey. Try another pair or ask your LGU to publish stop locations.</Text></View>}
        {!searched && <Text style={t(styles.muted)}>Choose your journey to search published Pangasinan transit routes.</Text>}
        {routes.map(r => <View key={r.id} style={t([styles.card, route?.id === r.id && { borderColor: '#EE7058' }])}>
          <View style={styles.row}><View style={t(styles.icon)}><Bus size={20} color={themeColor('#103E53', 'color')} /></View><View style={{ flex: 1 }}><Text style={t(styles.name)}>{r.name}</Text><Text style={t(styles.muted)}>{r.stops.length} stops · {r.type}</Text></View><Text style={t(styles.muted)}>Fare unconfirmed</Text></View>
          <Text style={t(styles.muted)}>{r.frequency}{r.firstDeparture && r.lastDeparture ? ` · ${r.firstDeparture} – ${r.lastDeparture}` : ''}</Text>
          {button('View route source', () => Linking.openURL(r.sourceUrl).catch(() => setMessage('Unable to open route source.')), MapPin, true)}
          <View style={styles.row}><View style={{ flex: 1 }}>{button('Set Stop Alert', () => choose(r), Bell)}</View><View style={{ flex: 1 }}>{button('Track Route', () => { choose(r); gps(); }, MapPin, true, busyGPS)}</View></View>
        </View>)}
      </View>
      <View style={[styles.right, compact && { width: '100%' }]}>
        <View style={t(styles.card)}><View style={styles.row}><Text style={t([styles.title, { flex: 1 }])}>Stop Alarm</Text><Text style={t(styles.muted)}>{alarm ? 'On' : 'Off'}</Text></View>
          <Select label="Alert me at" disabled={!route} value={String(stopIndex)} options={(route?.stops || []).map((s, i) => ({ value: String(i), label: s.name }))} onChange={v => { disarm(); setStopIndex(Number(v)); }} />
          {target && <TransitStopPreview stop={target} />}<Text style={t(styles.muted)}>Alert radius · {radius} m</Text><View style={[styles.row, { flexWrap: 'wrap' }]}>{[100, 300, 500, 1000, 2000].map(n => <FeedbackPressable key={n} accessibilityRole="button" accessibilityState={{ selected: radius === n }} onPress={() => { disarm(); setRadius(n); }} style={t([styles.chip, radius === n && styles.active])}><Text style={t(styles.muted)}>{n} m</Text></FeedbackPressable>)}</View>
          <View style={styles.row}>{modes.map(({ key, label, Icon }) => <FeedbackPressable key={key} accessibilityRole="button" accessibilityState={{ selected: mode === key }} onPress={() => { disarm(); setMode(key); }} style={t([styles.mode, mode === key && styles.active])}><Icon size={16} color={themeColor('#103E53', 'color')} /><Text style={t(styles.muted)}>{label}</Text></FeedbackPressable>)}</View>
          {button(arming ? 'Setting up…' : alarm ? 'Disable Alarm' : 'Enable Alarm', enable, Bell, false, !target || arming)}
          {button(tracking ? 'Stop Tracking' : 'Resume GPS Tracking', tracking ? halt : () => gps(), MapPin, true, !route || busyGPS)}
          <Text style={t(styles.muted)}>{tracking ? accurate ? `GPS active · accuracy ±${Math.round(position.coords.accuracy)} m` : 'Waiting for fresh, accurate GPS…' : 'GPS tracking off'}</Text>
          <Text style={t(styles.muted)}>{Platform.OS === 'web' ? 'Keep this page open for alerts. ' : 'Background alerts require an installed mobile build. Do not force-close the app. '}Distances are GPS proximity, not road distance or live vehicle arrival times.</Text>
        </View>
        <View style={t(styles.card)}><Text style={t(styles.title)}>Stop Progress</Text>{!route && <Text style={t(styles.muted)}>Select a route to see its stops.</Text>}{route?.stops.map((s, i) => <FeedbackPressable key={`${i}-${s.name}`} accessibilityRole="button" onPress={() => { disarm(); setStopIndex(i); }} style={styles.row}><View style={t([styles.dot, i === stopIndex && { borderColor: '#EE7058', backgroundColor: '#EE7058' }])} /><View style={{ flex: 1 }}><Text style={t(styles.name)}>{s.name}</Text><Text style={t(styles.muted)}>{fresh ? `${(distanceMeters(position.coords, s) / 1000).toFixed(2)} km away` : 'Waiting for GPS'}{i === stopIndex ? ' · Alert stop' : ''}</Text></View></FeedbackPressable>)}</View>
      </View>
    </View>{!!message && <View accessibilityLiveRegion="polite" style={t([styles.card, { marginTop: 16 }])}><Text style={t(styles.name)}>{message}</Text></View>}
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' }, screen: { padding: 32, paddingBottom: 48 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 }, right: { width: 310, gap: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#E9E8E4', gap: 14, shadowColor: '#103E53', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  title: { fontSize: 18, fontWeight: '700', color: '#103E53' }, name: { fontSize: 13, fontWeight: '600', color: '#103E53' }, muted: { fontSize: 12, color: '#758994', lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, button: { backgroundColor: '#EE7058', padding: 12, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }, secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E8EB' }, buttonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  chip: { padding: 7, borderRadius: 8, borderWidth: 1, borderColor: '#E3E8EB' }, active: { backgroundColor: '#FFF0EB', borderColor: '#EE7058' }, mode: { flex: 1, gap: 6, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8EB' }, icon: { padding: 12, borderRadius: 22, backgroundColor: '#EDF2F5' }, dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#DEE6E9' },
});
