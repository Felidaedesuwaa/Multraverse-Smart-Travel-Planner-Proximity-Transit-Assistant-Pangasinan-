import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Location from 'expo-location';
import { Bell, Bus, MapPin, Search, Vibrate, Volume2, Smartphone } from 'lucide-react-native';
import { FeedbackPressable } from '../components/WorkspaceMotion';
import AIToolHeader from '../components/AIToolHeader';
import Select from '../components/SuperAdminSelect';
import { useAppTheme } from '../theme/useAppTheme';
import { colors } from '../theme/colors';
import { api } from '../lib/api';
import map from '../data/pangasinanMap.json';
import { distanceMeters, municipality, isArrival } from '../lib/transitGeometry';
import { startTransitAlarm, stopTransitAlarm, getTransitSession, subscribeTransit } from '../lib/transitTracking';
import { useAuthStore } from '../store/authStore';
import { estimateTraditionalJeepneyFare } from '../lib/transitFare';
import TransitStopPreview from '../components/TransitStopPreview';
import { recordArrival } from '../lib/notificationEvents';
import TransitPinMap from '../components/TransitPinMap';
import TransitAlertTester from '../components/TransitAlertTester';
import TransitNotificationGate from '../components/TransitNotificationGate';
import { useTransitNotificationPermission } from '../hooks/useTransitNotificationPermission';
import { prepareTransitAlert, deliverTransitAlert, stopTransitAlertPlayback } from '../lib/transitAlerts';
import { transitArrivalMessage } from '../lib/transitArrivalMessage';

const modes = [{ key: 'vibrate', label: 'Vibrate', Icon: Vibrate }, { key: 'sound', label: 'Sound', Icon: Volume2 }, { key: 'push', label: 'Notify', Icon: Smartphone }];

export default function TransitAlarm() {
  const { width } = useWindowDimensions();
  const compact = width < 1100;
  const { themeStyle: t, themeColor, palette } = useAppTheme();
  const notificationAccess = useTransitNotificationPermission();
  const [from, setFrom] = useState('dagupan'), [to, setTo] = useState('alaminos');
  const [routes, setRoutes] = useState([]), [route, setRoute] = useState(null), [stopIndex, setStopIndex] = useState(0);
  const [referenceRoutes, setReferenceRoutes] = useState([]);
  const [radius, setRadius] = useState(500), [mode, setMode] = useState('vibrate');
  const [alarm, setAlarm] = useState(false), [tracking, setTracking] = useState(false), [busyGPS, setBusyGPS] = useState(false);
  const [position, setPosition] = useState(null), [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false), [searched, setSearched] = useState(false), [message, setMessage] = useState('');
  const watcher = useRef(null), generation = useRef(0), requestId = useRef(0);
  const background = useRef(false), fired = useRef(false);
  const [arming, setArming] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);
  const setupBusy = useRef(false), screen = useRef(null), alarmPanelY = useRef(0), columnsY = useRef(0);
  const alarmConfig = useRef(null);
  const [originPin, setOriginPin] = useState(null), [destinationPin, setDestinationPin] = useState(null);
  const [pinMode, setPinMode] = useState('origin');
  const target = route?.stops[stopIndex];
  alarmConfig.current = `${route?.id}:${stopIndex}:${radius}:${mode}`;
  const fresh = position && now - position.timestamp < 30000;
  const accurate = fresh && position.coords.accuracy != null && position.coords.accuracy <= Math.min(100, radius / 2);
  const options = map.areas.map(a => ({ value: a.id, label: a.name }));
  const disarm = () => { if (background.current && !watcher.current) setTracking(false); background.current = false; fired.current = true; setAlarm(false); stopTransitAlarm().catch(() => setMessage('Could not stop background tracking. Retry Stop Tracking.')); };
  const halt = () => { generation.current++; watcher.current?.remove(); watcher.current = null; setTracking(false); disarm(); };
  useEffect(() => {
    if (notificationAccess.denied && alarm) {
      halt(); setMessage('Turn on push notifications in Multraverse to use this feature.');
    }
  }, [notificationAccess.denied, alarm]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    let mounted = true;
    const restore = session => {
      if (!mounted) return;
      if (!session && Platform.OS !== 'web') {
        if (background.current && !watcher.current) setTracking(false);
        background.current = false; setAlarm(false); return;
      }
      if (!session || session.ownerId !== useAuthStore.getState().user?.id) return;
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
    return () => { mounted = false; clearInterval(timer); unsubscribe(); subscription.remove(); generation.current++; watcher.current?.remove(); stopTransitAlertPlayback(); };
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
      if (useOrigin) {
        changeEndpoint('from', municipality(p.coords));
        setOriginPin({ lat: p.coords.latitude, lng: p.coords.longitude, areaId: municipality(p.coords), name: 'Current location' });
        setPinMode('destination'); return;
      }
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 10, timeInterval: 3000 }, update, () => { halt(); setMessage('GPS tracking failed. Check location services and resume tracking.'); });
      if (generation.current !== run) subscription.remove();
      else { watcher.current = subscription; setTracking(true); return p; }
    } catch (e) { if (generation.current === run) { halt(); setMessage(e.message || 'Unable to obtain GPS location.'); } }
    finally { setBusyGPS(false); }
  }
  function changeEndpoint(which, value) {
    requestId.current++; halt(); setRoute(null); setRoutes([]); setReferenceRoutes([]); setSearched(false); setLoading(false);
    (which === 'from' ? setFrom : setTo)(value);
  }
  async function findRoutes() {
    const id = ++requestId.current;
    halt(); setRoute(null); setRoutes([]); setReferenceRoutes([]); setLoading(true); setMessage(''); setSearched(true);
    try {
      if (from === to) throw new Error('Choose two different Pangasinan municipalities.');
      const data = await api.searchTransitRoutes({ from, to });
      if (id === requestId.current) {
        setRoutes(data.routes.filter(r => r.stops.every(s => municipality(s) === s.areaId)));
        setReferenceRoutes(data.referenceRoutes || []);
      }
    } catch (e) { if (id === requestId.current) setMessage(e.message); }
    finally { if (id === requestId.current) setLoading(false); }
  }
  function choose(r) { halt(); setRoute(r); setStopIndex(r.stops.length - 1); setMessage('Route selected. Choose a stop, then enable its alarm.'); }
  async function prepareStopAlert(r) {
    choose(r);
    screen.current?.scrollTo({ y: columnsY.current + alarmPanelY.current, animated: true });
    const fix = await gps();
    if (fix) setMessage('Stop alert ready. Choose your stop, alert distance and alert mode, then tap Enable Alarm.');
  }
  function pickLocation(point, which = pinMode) {
    const areaId = municipality(point);
    if (!areaId) { setMessage('Choose a point inside Pangasinan.'); return; }
    halt(); setMessage('');
    const pin = { ...point, areaId, name: which === 'origin' ? 'Pinned start' : 'Pinned destination' };
    if (which === 'origin') { setOriginPin(pin); setFrom(areaId); setPinMode('destination'); }
    else { setDestinationPin(pin); setTo(areaId); }
    setRoute(null); setRoutes([]); setReferenceRoutes([]); setSearched(false);
    requestId.current++; setLoading(false);
  }
  async function trackPinnedJourney() {
    if (!originPin || !destinationPin) return;
    halt();
    setRoute({ id: 'pinned-journey', name: 'Pinned journey', stops: [originPin, destinationPin] });
    setStopIndex(1);
    await gps();
  }
  async function enable() {
    if (alarm) { halt(); return; }
    if (notificationAccess.blocked) return;
    if (setupBusy.current || busyGPS || testingAlert) return;
    if (!target) { setMessage('Select a route and stop first.'); return; }
    setupBusy.current = true;
    const config = alarmConfig.current, initialGeneration = generation.current;
    try {
      setArming(true);
      // Prepare browser alert APIs while the click still counts as a user gesture.
      if (Platform.OS === 'web') await prepareTransitAlert(mode);
      if (initialGeneration !== generation.current || config !== alarmConfig.current) return;
      const fix = tracking && accurate ? position : await gps();
      if (!fix || config !== alarmConfig.current) return;
      if (Date.now() - fix.timestamp >= 30000 || !Number.isFinite(fix.coords.accuracy) || fix.coords.accuracy < 0 || fix.coords.accuracy > Math.min(100, radius / 2)) {
        setMessage('GPS is tracking. Wait for a more accurate location, then tap Enable Alarm again.'); return;
      }
      const run = generation.current;
      if (Platform.OS !== 'web') {
        setMessage('Allow notifications and background location (“all the time”) to check this stop while your phone is locked.');
        await startTransitAlarm({ ownerId: useAuthStore.getState().user?.id, route, stopIndex, radius, mode });
        if (run !== generation.current || config !== alarmConfig.current) { await stopTransitAlarm(); return; }
        background.current = true; setAlarm(true); setMessage('Background alarm enabled for this trip (up to 8 hours). Keep location and notifications enabled.');
        return;
      }
      if (run !== generation.current) return;
      fired.current = false; setAlarm(true); setMessage('Alarm enabled. Keep this page open.');
    } catch (e) { setMessage(e.message); }
    finally { setupBusy.current = false; setArming(false); await notificationAccess.refresh(); }
  }
  useEffect(() => {
    if (Platform.OS !== 'web' || fired.current || !alarm || !target || !tracking || !isArrival(position, target, radius)) return;
    fired.current = true;
    setAlarm(false);
    const text = transitArrivalMessage(radius);
    setMessage(text);
    recordArrival(useAuthStore.getState().user?.id, `transit:${Date.now()}`, target.name, text).catch(() => {});
    deliverTransitAlert({ mode, title: 'Your stop is approaching', body: text }).catch(error => setMessage(`Stop reached, but the alert failed: ${error.message}`));
  }, [alarm, target, tracking, accurate, position, radius, mode]);
  function button(label, onPress, Icon = MapPin, secondary = false, disabled = false) {
    const foreground = secondary ? palette.ink : palette.onPrimary;
    return <FeedbackPressable lift accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ hovered, pressed }) => [t(styles.button), secondary && [styles.secondary, { backgroundColor: palette.paper, borderColor: palette.primary }],
        !disabled && (hovered || pressed) && { backgroundColor: secondary ? palette.tint : palette.brand }, disabled && { opacity: 0.45 }]}>
      <Icon size={14} color={foreground} /><Text style={[styles.buttonText, { color: foreground }]}>{label}</Text>
    </FeedbackPressable>;
  }
  function choiceStyle(base, selected, { hovered, pressed }) {
    return [base, { backgroundColor: selected ? palette.primary : palette.paper, borderColor: selected ? palette.primary : palette.line },
      (hovered || pressed) && { backgroundColor: selected ? palette.brand : palette.tint, borderColor: palette.brand }];
  }

  // ---- derived UI helpers (no logic change) ----
  const haveBothPins = !!originPin && !!destinationPin;
  const pinDistanceKm = haveBothPins ? (distanceMeters({ latitude: originPin.lat, longitude: originPin.lng }, destinationPin) / 1000).toFixed(2) : null;
  const pinAreaName = pin => pin ? (map.areas.find(a => a.id === pin.areaId)?.name || 'Unknown') : 'Not pinned yet';
  const resetPins = () => { halt(); setOriginPin(null); setDestinationPin(null); setPinMode('origin'); setMessage(''); };

  return (
    <ScrollView ref={screen} style={t(styles.container)} contentContainerStyle={t([styles.screen, compact && { padding: 16 }])}>
      <AIToolHeader
        eyebrow="PANGASINAN TRANSIT COMPANION"
        title="Transit Alarm"
        subtitle="Pin your start and destination on the map. We'll alert you when you arrive."
        badges={[{ label: 'Active route data' }, { label: 'Location-aware alerts' }, { label: 'Smart notifications', color: '#A78BFA' }]}
        Icon={Bell}
      />
      {compact && <View style={{ marginTop: 20 }}><TransitAlertTester radius={radius} disabled={alarm || arming} notificationAccess={notificationAccess} onTestingChange={setTestingAlert} /></View>}

      {!!message && (
        <View accessibilityLiveRegion="polite" style={t(styles.banner)}>
          <Text style={t(styles.bannerText)}>{message}</Text>
        </View>
      )}

      <View onLayout={event => { columnsY.current = event.nativeEvent.layout.y; }} style={t([styles.columns, compact && { flexDirection: 'column' }])}>
        {/* ---------- LEFT COLUMN ---------- */}
        <View style={styles.leftCol}>

          {/* STEP 1 — Pin journey */}
          <View style={t(styles.card)}>
            <View style={styles.stepHeader}>
              <View style={t(styles.stepBadge)}><Text style={t(styles.stepBadgeText)}>1</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={t(styles.title)}>Pin Your Journey</Text>
                <Text style={t(styles.muted)}>Tap the map to place point A (start) and point B (destination). Both must be inside Pangasinan.</Text>
              </View>
              {(originPin || destinationPin) && button('Reset', resetPins, MapPin, true)}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <FeedbackPressable
                  accessibilityRole="button"
                  onPress={() => setPinMode('origin')}
                  style={t([styles.pinToggle, pinMode === 'origin' && styles.pinToggleActive])}
                >
                  <View style={t([styles.pinDot, { backgroundColor: '#22C55E' }])} />
                  <View style={{ flex: 1 }}>
                    <Text style={t(styles.pinToggleLabel)}>Point A · Start</Text>
                    <Text style={t(styles.muted)} numberOfLines={1}>{pinAreaName(originPin)}</Text>
                  </View>
                </FeedbackPressable>
              </View>
              <View style={{ flex: 1 }}>
                <FeedbackPressable
                  accessibilityRole="button"
                  onPress={() => setPinMode('destination')}
                  style={t([styles.pinToggle, pinMode === 'destination' && styles.pinToggleActive])}
                >
                  <View style={t([styles.pinDot, { backgroundColor: '#EE7058' }])} />
                  <View style={{ flex: 1 }}>
                    <Text style={t(styles.pinToggleLabel)}>Point B · Destination</Text>
                    <Text style={t(styles.muted)} numberOfLines={1}>{pinAreaName(destinationPin)}</Text>
                  </View>
                </FeedbackPressable>
              </View>
            </View>

            <TransitPinMap origin={originPin} destination={destinationPin} pinMode={pinMode} onPick={point => pickLocation(point)} onMovePin={(which, point) => pickLocation(point, which)} />

            {haveBothPins ? (
              <View style={t(styles.summaryPill)}>
                <Text style={t(styles.summaryValue)}>{pinDistanceKm} km</Text>
                <Text style={t(styles.summaryLabel)}>straight-line distance between your pins</Text>
              </View>
            ) : (
              <Text style={t(styles.muted)}>Tap the map to set your {pinMode === 'origin' ? 'start point (A)' : 'destination (B)'}.</Text>
            )}

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                {button(busyGPS ? 'Locating…' : 'Use my GPS for A', () => gps(true), MapPin, true, busyGPS || arming)}
              </View>
              <View style={{ flex: 1 }}>
                {button(
                  busyGPS ? 'Starting…' : 'Track pinned journey',
                  trackPinnedJourney,
                  Bell,
                  false,
                  !haveBothPins || busyGPS || arming
                )}
              </View>
            </View>
            <Text style={t(styles.muted)}>
              Tracking uses live GPS proximity, not road distance or live vehicle arrival times.
            </Text>
          </View>

          {/* STEP 2 — Plan route */}
          <View style={t(styles.card)}>
            <View style={styles.stepHeader}>
              <View style={t(styles.stepBadge)}><Text style={t(styles.stepBadgeText)}>2</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={t(styles.title)}>Plan Your Route</Text>
                <Text style={t(styles.muted)}>Or search published Pangasinan transit routes between two municipalities.</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}><Select label="From" value={from} options={options} onChange={v => changeEndpoint('from', v)} /></View>
              <View style={{ flex: 1 }}><Select label="To" value={to} options={options} onChange={v => changeEndpoint('to', v)} /></View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>{button(busyGPS ? 'Locating…' : 'Use my GPS location', () => gps(true), MapPin, true, busyGPS)}</View>
              <View style={{ flex: 1 }}>{button(loading ? 'Finding routes…' : 'Find Routes', findRoutes, Search, false, loading)}</View>
            </View>
          </View>

          {/* STEP 3 — Route results */}
          <View style={styles.sectionHeader}>
            <Text style={t(styles.sectionTitle)}>Available Routes</Text>
            {searched && !loading && <Text style={t(styles.muted)}>{routes.length + referenceRoutes.length} found</Text>}
          </View>
          <Text style={t(styles.muted)}>Traditional-jeepney estimate: ₱14 for the first 4 km, then ₱2 per additional km. Per person for the full route; actual fares vary by vehicle.</Text>
          {loading && <ActivityIndicator />}
          {searched && !loading && !routes.length && !referenceRoutes.length && (
            <View style={t(styles.card)}>
              <Text style={t(styles.muted)}>No published route matches these endpoints in this direction. Try another pair or pin your destination for an alarm.</Text>
            </View>
          )}
          {!searched && <Text style={t(styles.muted)}>Choose your journey to search published Pangasinan transit routes.</Text>}

          {referenceRoutes.map(r => (
            <View key={r.id} style={t(styles.card)}>
              <Text style={t(styles.name)}>Route {r.routeNumber}: {r.name}</Text>
              <Text style={t(styles.muted)}>{r.authorizedMode} · {r.lengthKm} km · {r.authorizedUnits} authorized units</Text>
              <Text style={t(styles.muted)}>{r.roadAlignment}</Text>
              <Text style={t(styles.muted)}>Published {r.planYear} route plan. Current operations, fares and schedules are unconfirmed. Stop coordinates are not supplied; pin your destination above to use an alarm.</Text>
              <FeedbackPressable accessibilityRole="button" onPress={() => Linking.openURL(r.sourceUrl).catch(() => setMessage('Unable to open route source.'))}>
                <Text style={t(styles.link)}>View provincial route plan →</Text>
              </FeedbackPressable>
            </View>
          ))}

          {routes.map(r => (
            <View key={r.id} style={t([styles.card, route?.id === r.id && styles.selectedCard])}>
              <View style={styles.row}>
                <View style={t(styles.icon)}><Bus size={20} color={themeColor('#103E53', 'color')} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={t(styles.name)}>{r.name}</Text>
                  <Text style={t(styles.muted)}>{r.stops.length} alert points · {r.type}</Text>
                </View>
              </View>
              {estimateTraditionalJeepneyFare(r.lengthKm) != null
                ? <Text style={t(styles.name)}>Estimated full-route fare: ₱{estimateTraditionalJeepneyFare(r.lengthKm).toFixed(2)} <Text style={t(styles.muted)}>· {r.lengthKm} km · traditional-jeepney basis</Text></Text>
                : <Text style={t(styles.muted)}>Add the route distance to calculate a fare estimate.</Text>}
              {r.firstDeparture && r.lastDeparture && <Text style={t(styles.muted)}>Trips: {r.firstDeparture} – {r.lastDeparture}</Text>}
              {r.gpsReference && <Text style={t(styles.muted)}>Route {r.routeNumber} · Alerts use approximate town/locality locations. Pin your destination for a specific drop-off point.</Text>}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>{button('Set Stop Alert', () => prepareStopAlert(r), Bell, false, busyGPS || arming)}</View>
                <View style={{ flex: 1 }}>{button('Track Route', () => { choose(r); gps(); }, MapPin, true, busyGPS || arming)}</View>
              </View>
              <FeedbackPressable accessibilityRole="button" onPress={() => Linking.openURL(r.sourceUrl).catch(() => setMessage('Unable to open route source.'))}>
                <Text style={t(styles.link)}>View route source →</Text>
              </FeedbackPressable>
            </View>
          ))}
        </View>

        {/* ---------- RIGHT COLUMN ---------- */}
        <View onLayout={event => { alarmPanelY.current = event.nativeEvent.layout.y; }} style={[styles.right, compact && { width: '100%' }]}>
          {!compact && <TransitAlertTester radius={radius} disabled={alarm || arming} notificationAccess={notificationAccess} onTestingChange={setTestingAlert} />}
          <View style={t(styles.card)}>
            <View style={styles.row}>
              <Text style={t([styles.title, { flex: 1 }])}>Stop Alarm</Text>
              <View style={t([styles.statusPill, alarm ? styles.statusOn : styles.statusOff])}>
                <Text style={t([styles.statusText, alarm && { color: '#fff' }])}>{alarm ? 'ON' : 'OFF'}</Text>
              </View>
            </View>

            <Text style={t(styles.fieldLabel)}>Alert me at</Text>
            <Select
              label=""
              disabled={!route}
              value={String(stopIndex)}
              options={(route?.stops || []).map((s, i) => ({ value: String(i), label: s.name }))}
              onChange={v => { disarm(); setStopIndex(Number(v)); }}
            />
            {target && <TransitStopPreview stop={target} />}
            {target?.coordinateType && <Text style={t(styles.muted)}>This alarm uses an approximate municipal/locality waypoint from the supplied GPS reference. Choose a pinned destination for a more specific location.</Text>}

            <Text style={t(styles.fieldLabel)}>Alert radius · {radius} m</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
              {[100, 300, 500, 1000, 2000].map(n => (
                <FeedbackPressable key={n} accessibilityRole="button" accessibilityState={{ selected: radius === n }}
                  onPress={() => { disarm(); setRadius(n); }}
                  style={state => choiceStyle(styles.chip, radius === n, state)}>
                  <Text style={[styles.muted, { color: radius === n ? palette.onPrimary : palette.ink }]}>{n} m</Text>
                </FeedbackPressable>
              ))}
            </View>

            <Text style={t(styles.fieldLabel)}>How to alert</Text>
            <TransitNotificationGate access={notificationAccess}>
            <View style={styles.row}>
              {modes.map(({ key, label, Icon }) => (
                <FeedbackPressable key={key} accessibilityRole="button" disabled={notificationAccess.blocked} accessibilityState={{ selected: mode === key, disabled: notificationAccess.blocked }}
                  onPress={() => { disarm(); setMode(key); }}
                  style={state => choiceStyle(styles.mode, mode === key, state)}>
                  <Icon size={16} color={mode === key ? palette.onPrimary : palette.ink} />
                  <Text style={[styles.muted, { color: mode === key ? palette.onPrimary : palette.ink }]}>{label}</Text>
                </FeedbackPressable>
              ))}
            </View>
            </TransitNotificationGate>

            {button(arming ? 'Setting up…' : alarm ? 'Disable Alarm' : 'Enable Alarm', enable, Bell, false, !target || arming || busyGPS || testingAlert || (!alarm && notificationAccess.blocked))}
            {button(tracking ? 'Stop Tracking' : 'Resume GPS Tracking', tracking ? halt : () => gps(), MapPin, true, !route || busyGPS)}

            <Text style={t(styles.muted)}>
              {tracking
                ? (accurate ? `GPS active · accuracy ±${Math.round(position.coords.accuracy)} m` : 'Waiting for fresh, accurate GPS…')
                : 'GPS tracking off'}
            </Text>
            <Text style={t(styles.muted)}>
              {Platform.OS === 'web' ? 'Keep this page open for alerts. ' : 'An enabled alarm can alert with the screen locked or off. Keep the phone powered on and do not force-close the app. Allow background location and lock-screen notifications. '}
              Distances are GPS proximity, not road distance or live vehicle arrival times.
            </Text>
          </View>

          <View style={t(styles.card)}>
            <Text style={t(styles.title)}>Stop Progress</Text>
            {!route && <Text style={t(styles.muted)}>Select a route to see its stops.</Text>}
            {route?.stops.map((s, i) => (
              <FeedbackPressable key={`${i}-${s.name}`} accessibilityRole="button"
                onPress={() => { disarm(); setStopIndex(i); }}
                style={t([styles.stopRow, i === stopIndex && styles.stopRowActive])}>
                <View style={t([styles.dot, i === stopIndex && { borderColor: '#EE7058', backgroundColor: '#EE7058' }])} />
                <View style={{ flex: 1 }}>
                  <Text style={t(styles.name)}>{s.name}</Text>
                  <Text style={t(styles.muted)}>
                    {fresh ? `${(distanceMeters(position.coords, s) / 1000).toFixed(2)} km away` : 'Waiting for GPS'}
                  </Text>
                </View>
                {i === stopIndex && (
                  <View style={t(styles.alertPill)}><Text style={t(styles.alertPillText)}>Alert</Text></View>
                )}
              </FeedbackPressable>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  screen: { padding: 32, paddingBottom: 48 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  leftCol: { flex: 1, gap: 16, width: '100%' },
  right: { width: 330, gap: 16 },

  card: { backgroundColor: '#fff', padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#E9E8E4', gap: 12,
    shadowColor: '#103E53', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  selectedCard: { borderColor: '#EE7058', borderWidth: 1.5 },

  title: { fontSize: 17, fontWeight: '700', color: '#103E53' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#103E53' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginTop: 4 },
  name: { fontSize: 13, fontWeight: '600', color: '#103E53' },
  muted: { fontSize: 12, color: '#758994', lineHeight: 18 },
  link: { fontSize: 12, color: '#EE7058', fontWeight: '600', paddingVertical: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#758994', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 4 },

  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },

  button: { backgroundColor: '#EE7058', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E3E8EB' },
  buttonText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Step header
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF0EB', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepBadgeText: { color: '#EE7058', fontWeight: '800', fontSize: 13 },

  // Pin toggles
  pinToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8EB', backgroundColor: '#FBFBFA' },
  pinToggleActive: { borderColor: '#EE7058', backgroundColor: '#FFF7F4' },
  pinDot: { width: 12, height: 12, borderRadius: 6 },
  pinToggleLabel: { fontSize: 12, fontWeight: '700', color: '#103E53' },

  // Summary
  summaryPill: { backgroundColor: '#F3F7F8', borderRadius: 12, padding: 12, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 20, fontWeight: '800', color: '#103E53' },
  summaryLabel: { fontSize: 11, color: '#758994' },

  // Banner
  banner: { backgroundColor: '#FFF7F4', borderWidth: 1, borderColor: '#F4C7BC', borderRadius: 12, padding: 12, marginBottom: 16 },
  bannerText: { color: '#103E53', fontSize: 13, fontWeight: '600' },

  // Status pill
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusOn: { backgroundColor: '#EE7058' },
  statusOff: { backgroundColor: '#EDF2F5' },
  statusText: { fontSize: 10, fontWeight: '800', color: '#758994', letterSpacing: 0.5 },

  // Chips / modes
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: '#E3E8EB', backgroundColor: '#fff' },
  active: { backgroundColor: '#FFF0EB', borderColor: '#EE7058' },
  mode: { flex: 1, gap: 6, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E3E8EB', backgroundColor: '#fff' },
  icon: { padding: 12, borderRadius: 22, backgroundColor: '#EDF2F5' },

  // Stop progress
  stopRow: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 8, borderRadius: 10 },
  stopRowActive: { backgroundColor: '#FFF7F4' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#DEE6E9' },
  alertPill: { backgroundColor: '#EE7058', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  alertPillText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
});
