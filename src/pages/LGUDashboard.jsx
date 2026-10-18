import { filterNameInput } from '../utils/validation'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Modal, ScrollView, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import AdminSettings from './AdminSettings'
import LGUSidebar from '../components/LGUSidebar'
import LGUPage from '../components/LGUPage'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import MunicipalButton from '../components/MunicipalButton'
import PlaceFormSelect from '../components/PlaceFormSelect'
import ToggleSwitch from '../components/ToggleSwitch'
import { CheckCircle2, AlertCircle, Search, RefreshCw, Pencil, Trash2, Inbox, ShieldCheck, ImagePlus } from 'lucide-react-native'
import LGUOverview from '../components/LGUOverview'
import NotificationHeader from '../components/NotificationHeader'
import { chooseProfilePhoto } from '../lib/profilePhoto'
import { api } from '../lib/api'
import { lguResources } from '../data/lguResources'
import { colors } from '../theme/colors'
import { useAppTheme } from '../theme/useAppTheme'

export default function LGUDashboard() {
  const user = useAuthStore(state => state.user)
  const municipality = getLGUMunicipality(user?.municipality)
  const [resource, setResource] = useState('dashboard')
  const { width } = useWindowDimensions()
  return <View style={{ flex: 1, flexDirection: width >= 768 ? 'row' : 'column' }}>
    <LGUSidebar compact={width < 768} activeResource={resource} onNavigate={setResource} />
    <View style={{ flex: 1, minWidth: 0 }}><NotificationHeader />{resource === 'settings' ? <AdminSettings /> : municipality ? resource === 'dashboard' ? <LGUOverview key={`${user.id}:${user.municipality}`} municipality={municipality} onNavigate={setResource} /> : <MunicipalEditor key={`${user.id}:${user.municipality}:${resource}`} resource={resource} municipality={municipality} /> : <LGUPage title="Municipality unavailable"><Text>Your account needs a valid Pangasinan municipality. Contact an administrator.</Text></LGUPage>}</View>
  </View>
}

function MunicipalEditor({ resource, municipality }) {
  const { themeStyle, themeColor } = useAppTheme()
  const { width } = useWindowDimensions()
  const [search, setSearch] = useState('')
  const definition = lguResources[resource]
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [uploading, setUploading] = useState(false)
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { setRows(await api.getLGUResources(resource)) } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [resource])
  useEffect(() => { refresh() }, [refresh])
  const edit = item => {
    setDeleteId(null); setConfirming(false)
    setEditingId(item?.id || null)
    setDraft(Object.fromEntries(definition.fields.map(([key, , type, choices]) => [key, item?.[key] ?? (type === 'boolean' ? true : type === 'choice' ? choices[0] : '')])))
    setError(''); setNotice('')
  }
  const save = async (confirmed = false) => {
    if (busy || uploading || !draft) return
    setError(''); setBusy(true)
    try {
      if (resource === 'places') {
        for (const [field, max] of [['name', 120], ['description', 2000], ['location', 300], ['category', 120], ['openHours', 120]]) {
          const value = String(draft[field] || '').trim()
          if (value.length > max) throw new Error(`${field === 'openHours' ? 'Opening hours' : field} must be at most ${max} characters.`)
          if (/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) throw new Error('Use plain text without markup or control characters.')
        }
        if (String(draft.name || '').trim().length < 2) throw new Error('Place name must contain at least 2 characters.')
        if (draft.entryFee !== '' && (!/^\d+(?:\.\d{1,2})?$/.test(String(draft.entryFee)) || Number(draft.entryFee) > 1000000)) throw new Error('Entry fee must be between PHP 0 and PHP 1,000,000, with up to 2 decimal places.')
      }
      if (resource === 'foods') {
        for (const [field, label, max] of [['name', 'Food name', 120], ['description', 'Description', 2000], ['where', 'Where to find it', 300], ['category', 'Category', 120]]) {
          const value = String(draft[field] || '').trim()
          if (!value) throw new Error(`${label} is required.`)
          if (value.length > max) throw new Error(`${label} must be at most ${max} characters.`)
          if (/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) throw new Error('Use plain text without markup or control characters.')
        }
        if (String(draft.name).trim().length < 2) throw new Error('Food name must contain at least 2 characters.')
        if (!/^\d+(?:\.\d{1,2})?$/.test(String(draft.avgPrice)) || Number(draft.avgPrice) > 1000000) throw new Error('Average price must be between PHP 0 and PHP 1,000,000, with up to 2 decimal places.')
      }
      if (resource === 'route-prices') {
        for (const [field, label, max] of [['from', 'Origin', 120], ['to', 'Destination', 120], ['vehicle', 'Vehicle', 60], ['duration', 'Duration', 120]]) {
          const value = String(draft[field] || '').trim()
          if (value.length < 2 || value.length > max) throw new Error(`${label} must contain 2 to ${max} characters.`)
          if (/[<>\x00-\x1f\x7f]/.test(value)) throw new Error(`${label} must contain plain text without markup or control characters.`)
        }
        if (draft.from.trim().toLowerCase() === draft.to.trim().toLowerCase()) throw new Error('Origin and destination must be different.')
        if (!/^\d+(?:\.\d{1,2})?$/.test(String(draft.price)) || Number(draft.price) > 1000000) throw new Error('Fare must be between PHP 0 and PHP 1,000,000, with up to 2 decimal places.')
        const duration = draft.duration.trim().match(/^(?:(\d+)\s*(?:hours?|hrs?|h)\s*)?(?:(\d+)\s*(?:minutes?|mins?|m))?$/i)
        const minutes = duration ? Number(duration[1] || 0) * 60 + Number(duration[2] || 0) : 0
        if (minutes < 1 || minutes > 1440) throw new Error('Enter a duration from 1 minute to 24 hours, such as 30 min or 1 hour 15 min.')
      }
      if (resource === 'transit-routes') {
        const endpoints = String(draft.name || '').trim().split(/\s+(?:to|-)\s+/i)
        if (endpoints.length !== 2 || endpoints.some(value => value.trim().length < 2) || endpoints[0].trim().toLowerCase() === endpoints[1].trim().toLowerCase()) throw new Error('Enter both origin and destination, such as Sual to Dagupan.')
        if (draft.name.length > 120 || /[<>\x00-\x1f\x7f]/.test(draft.name)) throw new Error('Route name must use plain text and be at most 120 characters.')
        if (!['BUS', 'JEEPNEY', 'TRICYCLE', 'VAN'].includes(draft.type)) throw new Error('Select a vehicle type.')
        if (!String(draft.frequency || '').trim() || draft.frequency.length > 120 || /[<>\x00-\x1f\x7f]/.test(draft.frequency)) throw new Error('Enter a service frequency using plain text, at most 120 characters.')
        if (draft.stops !== '' && (!/^\d+$/.test(String(draft.stops)) || Number(draft.stops) > 500)) throw new Error('Number of stops must be a whole number between 0 and 500.')
      }
      const payload = {}
      for (const [key, label, type = ''] of definition.fields) {
        const value = typeof draft[key] === 'string' ? draft[key].trim() : draft[key]
        if (type.includes('required') && value === '') throw new Error(`${label} is required`)
        if (key === 'name' && resource !== 'transit-routes' && !/^\p{L}[\p{L}\p{M} .\u2019'-]*$/u.test(value)) throw new Error('Names accept letters and spaces; numbers are not accepted.')
        if (type.includes('number') && value !== '') {
          if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`${label} must be a nonnegative number`)
          if (key === 'stops' && !Number.isInteger(Number(value))) throw new Error('Number of stops must be a whole number')
          payload[key] = Number(value)
        } else if (type.includes('number')) { if (editingId && key === 'entryFee') payload[key] = null }
        else payload[key] = value
      }
      if (['places', 'foods', 'route-prices', 'transit-routes'].includes(resource) && !confirmed) { setConfirming(true); return }
      await api.submitLGUResource(resource, payload, editingId)
      setDraft(null); setConfirming(false); setNotice(`${resource === 'places' ? 'Place' : resource === 'foods' ? 'Local food' : resource === 'route-prices' ? 'Route price' : resource === 'transit-routes' ? 'Transit route' : 'Entry'} submitted successfully. An Admin will review it before publication.`); await refresh()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (busy || !deleteId) return
    setBusy(true); setError('')
    try { await api.deleteLGUResource(resource, deleteId); setDeleteId(null); setNotice('Deletion submitted for Admin approval.'); await refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const counts = Object.fromEntries(['pending', 'approved', 'rejected'].map(status => [status, rows.filter(row => (row.approvalStatus || 'approved') === status).length]))
  const visibleRows = rows.filter(row => (filter === 'all' || (row.approvalStatus || 'approved') === filter) && definition.fields.some(([key]) => String(key === 'photo' ? '' : row[key] ?? '').toLowerCase().includes(search.trim().toLowerCase())))
  const text = value => <Text style={themeStyle(styles.text)}>{value}</Text>
  const action = (label, Icon, onPress, disabled = false, danger = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => themeStyle([styles.action, danger && styles.dangerAction, (disabled || pressed) && { opacity: 0.5 }])}><Icon size={16} color={themeColor(danger ? '#B42318' : colors.oceanBlue, 'color')} /><Text style={themeStyle([styles.actionText, danger && styles.error])}>{label}</Text></Pressable>
  return <LGUPage title={definition.label} subtitle={`Manage ${definition.label.toLowerCase()} in ${municipality.name}. Keep information accurate for travelers.`} actions={<MunicipalButton label="Add entry" onPress={() => edit(null)} disabled={busy} />}>
    <View style={styles.stack}>
      <View style={themeStyle(styles.reviewStrip)}><ShieldCheck size={19} color={themeColor(colors.oceanBlue, 'color')} /><Text style={[themeStyle(styles.muted), styles.flex]}>New entries, edits, and deletions are reviewed by an Admin before publication.</Text></View>
      {error ? <View accessibilityRole="alert" style={themeStyle([styles.banner, styles.errorBanner])}><AlertCircle size={18} color={themeColor('#B42318', 'color')} /><Text style={[themeStyle(styles.error), styles.flex]}>{error}</Text></View> : null}
      {notice ? <View accessibilityRole="alert" style={themeStyle(styles.banner)}><CheckCircle2 size={18} color={themeColor(colors.palmGreen, 'color')} /><Text style={[themeStyle(styles.text), styles.flex]}>{notice}</Text></View> : null}
      {draft && <Modal visible transparent animationType="fade" onRequestClose={() => !busy && setDraft(null)}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalBackdrop}><Card style={[styles.stack, styles.editor]}>
        <View><Text style={themeStyle(styles.heading)}>{editingId ? 'Edit submission' : 'New submission'}</Text><Text style={themeStyle(styles.muted)}>Required fields are marked with *. Edited entries are hidden from Explorers until approved again.</Text></View>
        {error ? <View accessibilityRole="alert" style={themeStyle([styles.banner, styles.errorBanner])}><AlertCircle size={18} color={themeColor('#B42318', 'color')} /><Text style={[themeStyle(styles.error), styles.flex]}>{error}</Text></View> : null}
        <View style={styles.formGrid}>
          {definition.fields.map(([key, label, type, choices]) => <View key={key} style={[styles.field, { flexBasis: width >= 1100 && key !== 'description' && key !== 'notes' && key !== 'photo' ? '47%' : '100%' }]}>
            <Text style={themeStyle(styles.fieldLabel)}>{label}{type?.includes('required') ? ' *' : ''}</Text>
            {type === 'image' ? <View style={{ gap: 10 }}><Pressable accessibilityRole="button" accessibilityLabel={draft.photo ? 'Replace entry image' : 'Choose entry image'} disabled={busy || uploading} onPress={async () => { setUploading(true); setError(''); try { const photo = await chooseProfilePhoto({ preserveAspectRatio: true }); if (photo) setDraft(current => current ? { ...current, photo } : current); } catch (err) { setError(err.message || 'This image could not be opened. Try another image supported by your device.'); } finally { setUploading(false) } }} style={themeStyle({ width: '100%', minHeight: 200, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 14, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.oceanBlueLight, gap: 10 })}>
              {uploading ? <ActivityIndicator color={themeColor(colors.oceanBlue, 'color')} /> : draft.photo ? <Image source={{ uri: draft.photo }} style={{ width: '100%', height: 220 }} resizeMode="cover" /> : <><ImagePlus size={36} color={themeColor(colors.oceanBlue, 'color')} /><Text style={themeStyle(styles.text)}>Click to choose an image</Text><Text style={themeStyle(styles.muted)}>Image files up to 15 MB</Text></>}
            </Pressable>{draft.photo && <Pressable disabled={busy || uploading} accessibilityRole="button" onPress={() => setDraft(current => ({ ...current, photo: '' }))}>{text('Remove image')}</Pressable>}</View> : ((resource === 'places' && ['category', 'openHours', 'entryFee'].includes(key)) || (resource === 'foods' && ['category', 'avgPrice', 'where'].includes(key)) || (resource === 'route-prices' && ['vehicle', 'price', 'duration'].includes(key)) || (resource === 'transit-routes' && ['type', 'frequency', 'stops', 'status'].includes(key))) ? <PlaceFormSelect resource={resource} field={key} label={label} value={draft[key]} disabled={busy} onChange={value => { setConfirming(false); setDraft(current => ({ ...current, [key]: value })) }} /> : type === 'boolean' ? <ToggleSwitch accessibilityLabel={label} checked={draft[key]} onChange={value => !busy && setDraft({ ...draft, [key]: value })} /> : type === 'choice' ? <View style={styles.filters}>{choices.map(value => <Pressable key={value} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: draft[key] === value, disabled: busy }} onPress={() => setDraft({ ...draft, [key]: value })} style={themeStyle([styles.chip, draft[key] === value && styles.selected])}>{text(value)}</Pressable>)}</View> : <TextInput accessibilityLabel={label} editable={!busy} value={String(draft[key])} onChangeText={value => setDraft({ ...draft, [key]: key === 'name' && resource !== 'transit-routes' ? filterNameInput(value) : value })} keyboardType={type?.includes('number') ? 'decimal-pad' : 'default'} multiline={key === 'description' || key === 'notes'} maxLength={key === 'description' ? 2000 : key === 'location' ? 300 : 120} placeholder={({ from: `e.g. ${municipality.name} Public Market`, to: 'e.g. Dagupan City terminal', name: resource === 'transit-routes' ? `e.g. ${municipality.name} to Dagupan` : resource === 'foods' ? 'e.g. Inihaw na Bangus' : `e.g. ${municipality.name} Heritage Park`, description: resource === 'foods' ? 'Describe the dish, main ingredients, flavors and serving size.' : 'Describe the place, highlights and what travelers can expect.', location: 'e.g. Barangay Poblacion, Sual, Pangasinan' })[key] || `Enter ${label.toLowerCase()}`} placeholderTextColor={themeColor(colors.textMuted, 'color')} style={themeStyle([styles.input, (key === 'description' || key === 'notes') && styles.multiline])} />}
          </View>)}
        </View>
        {confirming && <View style={themeStyle([styles.banner, styles.confirmation])}><Text style={themeStyle(styles.heading)}>{resource === 'transit-routes' ? 'Submit this transit route for review?' : resource === 'route-prices' ? 'Submit this route price for review?' : resource === 'foods' ? 'Submit this local food for review?' : 'Submit this place for review?'}</Text><Text style={themeStyle(styles.text)}>{resource === 'route-prices' ? `${draft.from} to ${draft.to}` : draft.name} will be submitted to an Admin. {resource === 'transit-routes' ? 'Check the destination, vehicle type, frequency, stops and service status before continuing.' : resource === 'route-prices' ? 'Check the origin, destination, vehicle, fare and travel duration before continuing.' : resource === 'foods' ? 'Check the image, food details, price and where to find it before continuing.' : 'Check that the image, address, opening hours and fee are accurate before continuing.'}</Text><MunicipalButton label="Confirm submission" loading={busy} onPress={() => save(true)} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => setConfirming(false)} style={styles.chip}>{text('Keep editing')}</Pressable></View>}
        <View style={[styles.formActions, width < 600 && { flexDirection: 'column' }]}>{!confirming && <MunicipalButton style={styles.submitButton} labelStyle={{ fontSize: 16 }} label="Submit for approval" disabled={uploading} loading={busy} onPress={() => save()} />}<Pressable disabled={busy} onPress={() => setDraft(null)} accessibilityRole="button" accessibilityLabel="Cancel submission" style={({ pressed }) => themeStyle([styles.cancelButton, { opacity: busy ? 0.5 : pressed ? 0.75 : 1 }])}><Text style={themeStyle(styles.cancelLabel)}>Cancel</Text></Pressable></View>
      </Card></ScrollView></Modal>}
      <Card style={styles.stack}>
        <View style={styles.sectionHeader}><View style={styles.flex}><Text style={themeStyle(styles.heading)}>Your submissions</Text><Text style={themeStyle(styles.muted)}>Manage entries and review their approval status.</Text></View>{action('Refresh', RefreshCw, refresh, loading || busy)}</View>
        <View style={themeStyle(styles.search)}><Search size={18} color={themeColor(colors.textMuted, 'color')} /><TextInput accessibilityLabel="Search submissions" value={search} onChangeText={setSearch} placeholder="Search this category..." placeholderTextColor={themeColor(colors.textMuted, 'color')} style={themeStyle(styles.searchInput)} /></View>
        <View style={styles.filters}>{['all', 'pending', 'approved', 'rejected'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={themeStyle([styles.chip, filter === value && styles.selected])}><Text style={themeStyle([styles.filterText, filter === value && styles.selectedText])}>{value === 'all' ? 'All entries' : value[0].toUpperCase() + value.slice(1)} / {loading ? '--' : value === 'all' ? rows.length : counts[value]}</Text></Pressable>)}</View>
      </Card>
      {loading ? <View style={styles.empty}><ActivityIndicator color={themeColor(colors.oceanBlue, 'color')} /><Text style={themeStyle(styles.muted)}>Loading submissions...</Text></View> : visibleRows.map(row => <Card key={row.id} style={[styles.stack, styles.entryCard]}>
        <View style={styles.sectionHeader}><View style={styles.flex}><Text style={themeStyle(styles.entryTitle)}>{row.name || (row.from ? `${row.from} to ${row.to}` : row.location)}</Text>{row.pendingDeletion ? <Text style={themeStyle(styles.muted)}>Deletion awaiting Admin review</Text> : null}</View><StatusBadge status={row.approvalStatus || 'approved'} /></View>
        {row.rejectionReason ? <View style={themeStyle([styles.banner, styles.errorBanner])}><Text style={themeStyle(styles.text)}>Admin feedback: {row.rejectionReason}</Text></View> : null}
        <View style={styles.formGrid}>{row.photo ? <Image source={{ uri: row.photo }} style={{ width: 240, height: 160, borderRadius: 12 }} resizeMode="cover" /> : null}{definition.fields.filter(([key]) => key !== 'photo' && row[key] !== undefined && row[key] !== null && row[key] !== '').map(([key, label]) => <View key={key} style={[styles.detail, { flexBasis: width >= 1100 ? '30%' : '100%' }]}><Text style={themeStyle(styles.detailLabel)}>{label}</Text><Text style={themeStyle(styles.text)}>{typeof row[key] === 'boolean' ? row[key] ? 'Yes' : 'No' : String(row[key])}</Text></View>)}</View>
        <View style={themeStyle(styles.entryActions)}>{action('Edit', Pencil, () => edit(row), busy || row.pendingDeletion)}{action('Delete', Trash2, () => setDeleteId(row.id), busy || row.pendingDeletion, true)}</View>
        {deleteId === row.id && <View style={themeStyle([styles.banner, styles.confirmation])}><Text style={themeStyle(styles.text)}>Request deletion? This entry will be hidden while Admin reviews it.</Text><MunicipalButton label="Confirm deletion request" loading={busy} onPress={remove} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => setDeleteId(null)} style={styles.chip}>{text('Cancel')}</Pressable></View>}
      </Card>)}
      {!loading && !error && !visibleRows.length && <Card style={styles.empty}><Inbox size={32} color={themeColor(colors.textMuted, 'color')} /><Text style={themeStyle(styles.heading)}>{search.trim() ? 'No matching submissions' : 'No submissions yet'}</Text><Text style={[themeStyle(styles.muted), { textAlign: 'center' }]}>{search.trim() || filter !== 'all' ? 'Try another search or approval status.' : 'Create your first submission using the Add entry button above.'}</Text></Card>}
    </View>
  </LGUPage>
}
const styles = StyleSheet.create({
  modalBackdrop: { flexGrow: 1, backgroundColor: 'rgba(10, 27, 40, 0.55)', padding: 20, justifyContent: 'center', alignItems: 'center' }, editor: { width: '100%', maxWidth: 800, padding: 24 },
  entryCard: { padding: 24, shadowOpacity: 0, elevation: 0 }, stack: { gap: 20 }, flex: { flex: 1, minWidth: 0 },
  reviewStrip: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, backgroundColor: colors.oceanBlueLight },
  heading: { fontFamily: 'Poppins', fontSize: 17, fontWeight: '700', color: colors.oceanBlue }, entryTitle: { fontFamily: 'Poppins', fontSize: 18, fontWeight: '600', color: colors.oceanBlue },
  text: { color: colors.textPrimary, fontFamily: 'DMSans', fontSize: 14, lineHeight: 22 }, muted: { fontFamily: 'DMSans', fontSize: 13, lineHeight: 21, color: colors.textMuted }, error: { color: '#B42318', fontFamily: 'DMSans' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, backgroundColor: colors.palmGreenLight }, errorBanner: { backgroundColor: colors.coralLight },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, field: { flexGrow: 1, minWidth: 0, gap: 8 }, fieldLabel: { fontFamily: 'DMSans', fontSize: 13, fontWeight: '600', color: colors.oceanBlue },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 46, fontFamily: 'DMSans', color: colors.textPrimary, backgroundColor: colors.white }, multiline: { minHeight: 100, textAlignVertical: 'top' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }, chip: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10 }, selected: { backgroundColor: colors.oceanBlueLight }, filterText: { fontFamily: 'DMSans', fontSize: 13, color: colors.textMuted }, selectedText: { color: colors.oceanBlue, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12 }, searchInput: { flex: 1, minWidth: 0, paddingVertical: 13, fontFamily: 'DMSans', fontSize: 14, color: colors.textPrimary },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 9, backgroundColor: colors.oceanBlueLight }, actionText: { fontFamily: 'DMSans', fontSize: 12, fontWeight: '600', color: colors.oceanBlue }, dangerAction: { backgroundColor: colors.coralLight },
  entryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }, detail: { flexGrow: 1, minWidth: 0, gap: 4 }, detailLabel: { fontFamily: 'DMSans', fontSize: 11, color: colors.textMuted },
  confirmation: { flexDirection: 'column', alignItems: 'stretch' }, empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }, formActions: { flexDirection: 'row', alignItems: 'stretch', gap: 14, paddingTop: 12 }, submitButton: { flexGrow: 1, flexBasis: 0, minHeight: 56, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12 }, cancelButton: { flexGrow: 1, flexBasis: 0, minHeight: 56, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, cancelLabel: { fontFamily: 'DMSans', fontSize: 16, fontWeight: '700', color: colors.oceanBlue },
})
