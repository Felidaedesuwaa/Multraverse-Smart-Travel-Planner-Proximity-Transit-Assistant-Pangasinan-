import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { Eye, Pencil, Trash2 } from 'lucide-react-native';
import AdminPage from '../components/AdminPage';
import Card from '../components/Card';
import Select from '../components/SuperAdminSelect';
import ToggleSwitch from '../components/ToggleSwitch';
import GeofenceMap from '../components/GeofenceMap';
import GeofenceTracking from '../components/GeofenceTracking';
import { useAppTheme } from '../theme/useAppTheme';
import { api } from '../lib/api';
import geometry from '../data/pangasinanMap.json';
import { boundaryRings, containsLocation, projectLocation } from '../utils/lguMap';

const boundaries = geometry.areas.map(a => ({ ...a, rings: boundaryRings(a.d) }));
const locate = p => boundaries.find(a => containsLocation(a.rings, projectLocation(p)));
const types = ['Transit stop', 'Terminal', 'Tourist area', 'Safety zone'];
const blank = { location: '', zone: types[0], radius: '', lat: '', lng: '', dwell: '120', advisory: '' };
export default function AdminGeofences() {
  const { palette: p } = useAppTheme();
  const [zones, setZones] = useState([]), [events, setEvents] = useState([]), [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank), [editId, setEditId] = useState(null), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState(''), [filter, setFilter] = useState('All'), [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null), [deleting, setDeleting] = useState(null);
  async function load() {
    try { const [z, e] = await Promise.all([api.getGeofences(), api.getGeofenceEvents()]); setZones(z); setEvents(e); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); const timer = setInterval(load, 15000); return () => clearInterval(timer); }, []);
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }));
  function pick(point) {
    if (!locate(point)) { setError('Choose a centre inside Pangasinan.'); return; }
    setError(''); setSelected(point); setForm(current => ({ ...current, lat: point.lat.toFixed(6), lng: point.lng.toFixed(6) }));
  }
  async function gps() {
    try {
      if (!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error('Allow location access to use GPS.');
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High, ...(Platform.OS === 'web' ? { maximumAge: 0, timeout: 15000 } : {}) });
      pick({ lat: fix.coords.latitude, lng: fix.coords.longitude });
    } catch (e) { setError(e.message); }
  }
  async function save() {
    setError(''); setNotice('');
    try {
      const coordinates = { lat: Number(form.lat), lng: Number(form.lng) }, radiusMeters = Number(form.radius), dwellSeconds = Number(form.dwell);
      if (!form.location.trim() || !form.lat.trim() || !form.lng.trim() || !Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng) || !locate(coordinates)) throw new Error('Enter a zone name and valid Pangasinan latitude and longitude.');
      if (!Number.isFinite(radiusMeters) || radiusMeters < 10 || radiusMeters > 10000) throw new Error('Radius must be between 10 and 10,000 metres.');
      if (!Number.isInteger(dwellSeconds) || dwellSeconds < 30 || dwellSeconds > 86400) throw new Error('Dwell time must be a whole number from 30 to 86,400 seconds.');
      setBusy(true);
      const data = { location: form.location.trim(), zone: form.zone, radius: radiusMeters + ' m', radiusMeters, coordinates, coord: coordinates.lat + ', ' + coordinates.lng, dwellSeconds, advisory: form.advisory.trim() };
      if (editId) await api.updateGeofence(editId, data); else await api.createGeofence(data);
      setForm(blank); setEditId(null); setSelected(null); setNotice('Geofence saved successfully.'); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function edit(z) {
    setEditId(z.id); setSelected(z.coordinates || null);
    setForm({ location: z.location, zone: z.zone, radius: String(z.radiusMeters || ''), lat: String(z.coordinates?.lat ?? ''), lng: String(z.coordinates?.lng ?? ''), dwell: String(z.dwellSeconds || 120), advisory: z.advisory || '' });
    setNotice('Editing ' + z.location + '. Update the form above, then save.'); setError('');
  }
  async function toggle(z) {
    setBusy(true);
    try { await api.updateGeofence(z.id, { active: !z.active }); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await api.deleteGeofence(deleting.id); if (editId === deleting.id) { setEditId(null); setForm(blank); } setDeleting(null); await load(); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const visible = zones.filter(z => (filter === 'All' || (filter === 'Active' ? z.active && z.monitorable : !z.active || !z.monitorable)) && (z.location + ' ' + z.zone).toLowerCase().includes(search.toLowerCase()));
  const label = text => <Text style={[styles.label, { color: p.muted }]}>{text}</Text>;
  const button = (text, action, disabled = false) => <Pressable accessibilityRole="button" disabled={disabled} onPress={action} style={[styles.button, { backgroundColor: p.ink, opacity: disabled ? 0.5 : 1 }]}><Text style={{ color: p.surface, fontFamily: 'DMSans', fontWeight: '700' }}>{text}</Text></Pressable>;
  const input = (key, title, numeric = false) => <View style={styles.field}>{label(title)}<TextInput accessibilityLabel={title} value={form[key]} onChangeText={v => change(key, v)} keyboardType={numeric ? 'decimal-pad' : 'default'} style={[styles.input, { backgroundColor: p.background, borderColor: p.line, color: p.ink }]} /></View>;
  return <AdminPage title="Geofence Management" subtitle="Create and monitor zones strictly within Pangasinan">
    <View style={styles.stats}>{[['Active zones', zones.filter(z => z.active && z.monitorable).length], ['Total zones', zones.length], ['Recorded alerts', zones.reduce((n, z) => n + z.alerts, 0)]].map(([title, value]) => <Card key={title} style={{ flex: 1, minWidth: 160 }}><Text style={[styles.count, { color: p.ink }]}>{value}</Text>{label(title)}</Card>)}</View>
    <GeofenceTracking onEvents={load} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={{ color: p.ink, marginBottom: 14 }}>{notice}</Text>}
    <Card style={{ marginBottom: 24 }}>
      <Text style={[styles.heading, { color: p.ink }]}>{editId ? 'Edit geofence' : 'Add geofence'}</Text>
      <View style={styles.form}>
        {input('location', 'Zone name')}
        <View style={styles.field}><Select label="Zone type" value={form.zone} onChange={v => change('zone', v)} options={[...new Set([...types, form.zone])].map(v => ({ value: v, label: v }))} /></View>
        {input('radius', 'Radius (metres)', true)}{input('lat', 'Latitude', true)}{input('lng', 'Longitude', true)}{input('dwell', 'Dwell time (seconds)', true)}{input('advisory', 'Alert message')}
      </View>
      <View style={styles.actions}>{button(busy ? 'Saving…' : editId ? 'Save changes' : 'Add zone', save, busy)}{button('Use my GPS', gps, busy)}{editId && button('Cancel edit', () => { setEditId(null); setForm(blank); setSelected(null); })}</View>
    </Card>
    <Card style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
      <View style={styles.toolbar}><View style={styles.actions}>{['All', 'Active', 'Inactive'].map(f => <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: filter === f }} onPress={() => setFilter(f)} style={[styles.pill, { backgroundColor: filter === f ? p.ink : p.tint }]}><Text style={{ color: filter === f ? p.surface : p.ink }}>{f}</Text></Pressable>)}</View><TextInput accessibilityLabel="Search zones" placeholder="Search zones…" value={search} onChangeText={setSearch} placeholderTextColor={p.muted} style={[styles.input, { color: p.ink, borderColor: p.line, minWidth: 190 }]} /></View>
      {loading ? <ActivityIndicator style={{ margin: 24 }} /> : <ScrollView horizontal><View style={{ minWidth: 900, flex: 1 }}>
        <View style={[styles.row, { backgroundColor: p.background }]}>{['ZONE NAME', 'TYPE', 'RADIUS', 'LAT / LNG', 'ALERTS', 'STATUS', 'ACTIONS'].map((s, i) => <View key={s} style={{ width: [190, 140, 90, 175, 70, 100, 120][i] }}>{label(s)}</View>)}</View>
        {visible.map(z => <View key={z.id} style={[styles.row, { borderBottomColor: p.line, borderBottomWidth: 1 }]}>
          <View style={{ width: 190, flexDirection: 'row', gap: 10, alignItems: 'center' }}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: z.active ? '#278250' : '#8b99a5' }} /><Text style={[styles.name, { color: p.ink, flex: 1 }]}>{z.location}</Text></View>
          <Text style={{ width: 140, color: p.ink }}>{z.zone}</Text><Text style={{ width: 90, color: p.muted }}>{z.radiusMeters ? z.radiusMeters + ' m' : 'Needs setup'}</Text>
          <Text style={{ width: 175, color: p.muted, fontSize: 12 }}>{z.coordinates?.lat != null && z.coordinates?.lng != null ? z.coordinates.lat.toFixed(5) + ', ' + z.coordinates.lng.toFixed(5) : 'Needs coordinates'}</Text>
          <Text style={{ width: 70, color: p.ink, fontWeight: '700' }}>{z.alerts}</Text>
          <View style={{ width: 100 }}><ToggleSwitch checked={z.active} onChange={() => !busy && toggle(z)} /><Text style={{ color: p.muted, fontSize: 11 }}>{!z.monitorable ? 'Needs setup' : z.active ? 'active' : 'inactive'}</Text></View>
          <View style={{ width: 120, flexDirection: 'row', gap: 10 }}>{[[Eye, 'View ' + z.location, () => { setSelected(z.coordinates || null); setNotice(z.location + ': ' + (z.advisory || z.zone) + ' · Dwell ' + (z.dwellSeconds || 120) + 's'); }], [Pencil, 'Edit ' + z.location, () => edit(z)], [Trash2, 'Delete ' + z.location, () => setDeleting(z)]].map(([Icon, title, action]) => <Pressable key={title} accessibilityRole="button" accessibilityLabel={title} onPress={action} disabled={busy} style={{ backgroundColor: p.tint, padding: 7, borderRadius: 20 }}><Icon size={15} color={p.ink} /></Pressable>)}</View>
        </View>)}
        {!visible.length && <Text style={{ color: p.muted, padding: 24 }}>{zones.length ? 'No zones match your search.' : 'No geofences yet. Add a Pangasinan zone above.'}</Text>}
      </View></ScrollView>}
    </Card>
    <Card style={{ marginBottom: 24 }}><GeofenceMap zones={zones} selected={selected} onPick={pick} /></Card>
    <Card><View style={styles.toolbar}><Text style={[styles.heading, { color: p.ink }]}>Recent geofence events</Text>{button('Refresh', load)}</View>{events.map((e, i) => <View key={e._id || i} style={[styles.event, { borderBottomColor: p.line }]}><Text style={{ color: p.ink, flex: 1 }}>{e.location}</Text><Text style={{ color: p.ink, width: 70 }}>{e.type}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{new Date(e.timestamp).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</Text></View>)}{!events.length && <Text style={{ color: p.muted }}>No GPS events recorded yet. Enable GPS alerts on a device to monitor saved zones.</Text>}<Text style={{ color: p.muted, fontSize: 11, marginTop: 12 }}>Latest 100 events; each device retains its last 500 events. Alert totals remain cumulative.</Text></Card>
    <Modal visible={!!deleting} transparent animationType="fade" onRequestClose={() => !busy && setDeleting(null)}><View style={styles.overlay}><View style={[styles.dialog, { backgroundColor: p.surface }]}><Text style={[styles.heading, { color: p.ink }]}>Delete {deleting?.location}?</Text><Text style={{ color: p.muted }}>This zone will stop monitoring. Recorded events remain available.</Text><View style={styles.actions}>{button('Delete zone', remove, busy)}{button('Cancel', () => setDeleting(null), busy)}</View></View></View></Modal>
  </AdminPage>;
}
const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 20 },
  count: { fontFamily: 'Poppins', fontSize: 28 }, label: { fontFamily: 'DMSans', fontSize: 11, letterSpacing: 0.6, marginBottom: 7 },
  heading: { fontFamily: 'Poppins', fontSize: 20, marginBottom: 14 }, form: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 }, field: { flexGrow: 1, width: 220 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 44, fontFamily: 'DMSans' },
  button: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 22 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 10 },
  toolbar: { padding: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center', justifyContent: 'space-between' }, pill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 22 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 18, minHeight: 76 }, name: { fontFamily: 'DMSans', fontWeight: '700', fontSize: 14 }, error: { color: '#c54136', marginBottom: 16 },
  event: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  overlay: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }, dialog: { padding: 24, gap: 14, borderRadius: 20, maxWidth: 460, width: '100%', alignSelf: 'center' },
});
