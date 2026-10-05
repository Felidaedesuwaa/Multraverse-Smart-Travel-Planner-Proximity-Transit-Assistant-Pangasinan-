import { useEffect, useRef, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { Bell, FlaskConical, Smartphone, Vibrate, Volume2 } from 'lucide-react-native';
import { FeedbackPressable } from './WorkspaceMotion';
import { useAppTheme } from '../theme/useAppTheme';
import { getTransitAlertCapabilities, prepareTransitAlert, deliverTransitAlert, stopTransitAlertPlayback } from '../lib/transitAlerts';
import { testHasArrived } from '../lib/transitAlarmTest';
import { transitArrivalMessage } from '../lib/transitArrivalMessage';
import TransitNotificationGate from './TransitNotificationGate';

const modes = [{ key: 'vibrate', label: 'Vibrate', Icon: Vibrate }, { key: 'sound', label: 'Sound', Icon: Volume2 }, { key: 'push', label: 'Notify', Icon: Smartphone }];
export default function TransitAlertTester({ radius, disabled = false, notificationAccess, onTestingChange }) {
  const { palette } = useAppTheme();
  const focused = useIsFocused();
  const capabilities = getTransitAlertCapabilities();
  const [mode, setMode] = useState(capabilities.vibrate.available ? 'vibrate' : 'sound');
  const [busy, setBusy] = useState(false), [remaining, setRemaining] = useState(null), [message, setMessage] = useState('Choose an alert and test it without GPS or a route.');
  const timer = useRef(null), revision = useRef(0), mounted = useRef(true);
  const blocked = !!notificationAccess?.blocked;
  function cancel(update = true) {
    revision.current++; clearInterval(timer.current); timer.current = null; stopTransitAlertPlayback();
    if (update && mounted.current) { setBusy(false); setRemaining(null); setMessage('Test cancelled. No test alert will be triggered.'); }
  }
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') cancel(); });
    return () => { mounted.current = false; cancel(false); subscription.remove(); };
  }, []);
  useEffect(() => { if (timer.current) cancel(); }, [radius]);
  useEffect(() => { if ((disabled || blocked) && timer.current) cancel(); }, [disabled, blocked]);
  useEffect(() => { if (!focused) cancel(); }, [focused]);
  useEffect(() => { onTestingChange?.(busy); }, [busy, onTestingChange]);
  useEffect(() => () => onTestingChange?.(false), [onTestingChange]);
  async function test(simulated) {
    if (busy || disabled || blocked || !focused || !capabilities[mode].available) return;
    const run = ++revision.current, selected = mode;
    setBusy(true); setMessage('Setting up your test alert…');
    const current = () => mounted.current && run === revision.current;
    const deliver = async () => {
      if (!current()) return;
      try {
        if (simulated && !testHasArrived(true, radius)) throw new Error('The simulated location did not reach the test stop.');
        const body = Platform.OS === 'web'
          ? simulated ? `Simulated arrival within ${radius} m. This is a test, not a real stop.` : 'Your selected transit alert is being tested. No GPS is in use.'
          : transitArrivalMessage(radius);
        await deliverTransitAlert({ mode: selected, title: 'Transit Alarm test', body, test: true });
        if (current()) setMessage(`${modes.find(m => m.key === selected).label} test requested${simulated ? ' after simulated arrival' : ''}. Check your device${selected === 'push' ? ' notification center' : selected === 'sound' ? ' alert volume' : ' vibration'}.`);
      } catch (error) { if (current()) setMessage(error.message || 'Test alert failed. Check device permissions.'); }
      finally { if (current()) { setBusy(false); setRemaining(null); } await notificationAccess?.refresh(); }
    };
    try {
      await prepareTransitAlert(selected);
      if (!current()) return;
      if (!simulated) { await deliver(); return; }
      if (testHasArrived(false, radius)) throw new Error('The simulated journey must start outside the alert radius.');
      let seconds = 5;
      setRemaining(seconds); setMessage('Simulated GPS is outside the radius. Keep this screen open until arrival.');
      timer.current = setInterval(() => {
        if (!current()) { clearInterval(timer.current); timer.current = null; return; }
        seconds--; setRemaining(seconds);
        if (seconds === 0) { clearInterval(timer.current); timer.current = null; deliver(); }
      }, 1000);
    } catch (error) { if (current()) { setMessage(error.message || 'Unable to prepare your alert.'); setBusy(false); setRemaining(null); } }
    finally { await notificationAccess?.refresh(); }
  }
  const action = (label, onPress, disabled = false, secondary = false) => <FeedbackPressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={({ hovered, pressed }) => [styles.action, { backgroundColor: secondary ? palette.paper : palette.primary, borderColor: palette.line }, !disabled && (hovered || pressed) && { backgroundColor: palette.brand }, disabled && { opacity: 0.45 }]}>
    <Text style={{ color: secondary ? palette.ink : palette.onPrimary, fontWeight: '600' }}>{label}</Text>
  </FeedbackPressable>;
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }]}>
    <View style={styles.heading}><FlaskConical size={22} color={palette.accent} /><Text style={[styles.title, { color: palette.ink }]}>Test Transit Alerts</Text></View>
    <Text style={{ color: palette.muted }}>Simulation only. No real stop, location permission or route data is required.</Text>
    <TransitNotificationGate access={notificationAccess}>
    <View style={styles.row}>{modes.map(({ key, label, Icon }) => <FeedbackPressable key={key} accessibilityRole="button" accessibilityLabel={`Test mode: ${label}`} accessibilityState={{ selected: mode === key, disabled: busy || disabled || blocked }} disabled={busy || disabled || blocked}
      onPress={() => { cancel(false); setMode(key); setMessage(capabilities[key].detail); }}
      style={[styles.mode, { backgroundColor: mode === key ? palette.primary : palette.paper, borderColor: palette.line }]}>
      <Icon size={20} color={mode === key ? palette.onPrimary : palette.ink} /><Text style={{ color: mode === key ? palette.onPrimary : palette.ink }}>{label}</Text>
    </FeedbackPressable>)}</View>
    </TransitNotificationGate>
    <Text style={{ color: palette.muted }}>{capabilities[mode].detail}</Text>
    {disabled && <Text style={{ color: palette.accent }}>Disable the trip alarm before testing alerts.</Text>}
    {action(busy && remaining == null ? 'Preparing alert…' : 'Test alert now', () => test(false), busy || disabled || blocked || !capabilities[mode].available)}
    {action(remaining != null ? `Simulated arrival in ${remaining}s` : 'Simulate arrival in 5 seconds', () => test(true), busy || disabled || blocked || !capabilities[mode].available, true)}
    {busy && action('Cancel test', () => cancel(), false, true)}
    <View style={[styles.status, { backgroundColor: palette.paper }]}><Bell size={18} color={palette.accent} /><Text accessibilityLiveRegion="polite" style={{ flex: 1, color: palette.ink }}>{message}</Text></View>
    <Text style={{ color: palette.muted, fontSize: 12 }}>Keep this screen open for simulated arrival. {Platform.OS === 'web' ? 'Browser alerts depend on device support; iPhone Safari cannot vibrate.' : 'Silent mode, notification permissions and Focus settings can suppress alerts.'} Notify tests a system notification generated on this device; it does not need a remote push server.</Text>
  </View>;
}
const styles = StyleSheet.create({
  card: { padding: 22, borderWidth: 1, borderRadius: 22, gap: 14 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, title: { flex: 1, fontSize: 20, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10 }, mode: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  action: { minHeight: 44, alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  status: { flexDirection: 'row', gap: 8, padding: 12, borderRadius: 12 },
});
