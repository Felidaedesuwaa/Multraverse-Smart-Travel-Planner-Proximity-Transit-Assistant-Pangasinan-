import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { getLGUMunicipality } from '../data/lguMunicipalities'
import LGUMunicipalityMap from '../components/LGUMunicipalityMap'
import LGUSidebar from '../components/LGUSidebar'
import LGUPage from '../components/LGUPage'
import Card from '../components/Card'
import StatusBadge from '../components/StatusBadge'
import GradientButton from '../components/GradientButton'
import ToggleSwitch from '../components/ToggleSwitch'
import { CheckCircle2, Clock3, FileText, AlertCircle, Search, RefreshCw, Pencil, Trash2, Inbox, ShieldCheck } from 'lucide-react-native'
import AdminStatCard from '../components/AdminStatCard'
import { api } from '../lib/api'
import { lguResources } from '../data/lguResources'
import { colors } from '../theme/colors'
import { useAppTheme } from '../theme/useAppTheme'

export default function LGUDashboard() {
  const user = useAuthStore(state => state.user)
  const municipality = getLGUMunicipality(user?.municipality)
  const [resource, setResource] = useState('places')
  const { width } = useWindowDimensions()
  return <View style={{ flex: 1, flexDirection: width >= 768 ? 'row' : 'column' }}>
    <LGUSidebar compact={width < 768} activeResource={resource} onNavigate={setResource} />
    <View style={{ flex: 1, minWidth: 0 }}>{municipality ? <MunicipalEditor key={`${user.id}:${user.municipality}:${resource}`} resource={resource} municipality={municipality} /> : <LGUPage title="Municipality unavailable"><Text>Your account needs a valid Pangasinan municipality. Contact an administrator.</Text></LGUPage>}</View>
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
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try { setRows(await api.getLGUResources(resource)) } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [resource])
  useEffect(() => { refresh() }, [refresh])
  const edit = item => {
    setEditingId(item?.id || null)
    setDraft(Object.fromEntries(definition.fields.map(([key, , type, choices]) => [key, item?.[key] ?? (type === 'boolean' ? true : type === 'choice' ? choices[0] : '')])))
    setError(''); setNotice('')
  }
  const save = async () => {
    setError(''); setBusy(true)
    try {
      const payload = {}
      for (const [key, label, type = ''] of definition.fields) {
        const value = typeof draft[key] === 'string' ? draft[key].trim() : draft[key]
        if (type.includes('required') && value === '') throw new Error(`${label} is required`)
        if (type.includes('number') && value !== '') {
          if (!Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`${label} must be a nonnegative number`)
          payload[key] = Number(value)
        } else if (type.includes('number')) { if (editingId && key === 'entryFee') payload[key] = null }
        else payload[key] = value
      }
      await api.submitLGUResource(resource, payload, editingId)
      setDraft(null); setNotice('Submitted for Admin approval.'); await refresh()
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true); setError('')
    try { await api.deleteLGUResource(resource, deleteId); setDeleteId(null); setNotice('Deletion submitted for Admin approval.'); await refresh() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const counts = Object.fromEntries(['pending', 'approved', 'rejected'].map(status => [status, rows.filter(row => (row.approvalStatus || 'approved') === status).length]))
  const visibleRows = rows.filter(row => (filter === 'all' || (row.approvalStatus || 'approved') === filter) && definition.fields.some(([key]) => String(row[key] ?? '').toLowerCase().includes(search.trim().toLowerCase())))
  const text = value => <Text style={themeStyle(styles.text)}>{value}</Text>
  const action = (label, Icon, onPress, disabled = false, danger = false) => <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => themeStyle([styles.action, danger && styles.dangerAction, (disabled || pressed) && { opacity: 0.5 }])}><Icon size={16} color={themeColor(danger ? '#B42318' : colors.oceanBlue, 'color')} /><Text style={themeStyle([styles.actionText, danger && styles.error])}>{label}</Text></Pressable>
  return <LGUPage title={`${definition.label} dashboard`}>
    <View style={styles.stack}>
      <View style={styles.stats}>
        {[
          ['Total entries', rows.length, 'In this category', FileText, colors.oceanBlue, colors.oceanBlueLight],
          ['Pending review', counts.pending, 'Awaiting Admin approval', Clock3, colors.gold, colors.goldLight],
          ['Approved', counts.approved, 'Approved by Admin', CheckCircle2, colors.palmGreen, colors.palmGreenLight],
          ['Needs attention', counts.rejected, 'Review feedback and resubmit', AlertCircle, colors.sunsetCoral, colors.coralLight],
        ].map(([label, value, delta, Icon, color, background]) => <View key={label} style={{ flexGrow: 1, flexBasis: width >= 1200 ? '22%' : width >= 480 ? '45%' : '100%' }}><AdminStatCard label={label} value={loading ? '--' : value} delta={delta} icon={<Icon size={19} color={themeColor(color, 'color')} />} iconBg={background} dividerColor={color} /></View>)}
      </View>
      <View style={[styles.overview, width < 1100 && styles.vertical]}>
        <View style={styles.flex}><LGUMunicipalityMap key={municipality.id} municipality={municipality} /></View>
        <Card style={[styles.guide, width >= 1100 && { maxWidth: 320 }]}>
          <View style={themeStyle(styles.guideIcon)}><ShieldCheck size={24} color={themeColor(colors.oceanBlue, 'color')} /></View>
          <Text style={themeStyle(styles.heading)}>Keep your municipality up to date</Text>
          <Text style={themeStyle(styles.muted)}>Share accurate {definition.label.toLowerCase()} information for {municipality.name}. Every submission is reviewed by an Admin before publication.</Text>
          <View style={themeStyle(styles.guideNote)}><Clock3 size={17} color={themeColor(colors.textMuted, 'color')} /><Text style={[themeStyle(styles.muted), styles.flex]}>Edits and deletion requests also require approval.</Text></View>
          <GradientButton label="New submission" onPress={() => edit(null)} disabled={busy} />
        </Card>
      </View>
      {error ? <View accessibilityRole="alert" style={themeStyle([styles.banner, styles.errorBanner])}><AlertCircle size={18} color={themeColor('#B42318', 'color')} /><Text style={[themeStyle(styles.error), styles.flex]}>{error}</Text></View> : null}
      {notice ? <View accessibilityRole="alert" style={themeStyle(styles.banner)}><CheckCircle2 size={18} color={themeColor(colors.palmGreen, 'color')} /><Text style={[themeStyle(styles.text), styles.flex]}>{notice}</Text></View> : null}
      {draft && <Card style={styles.stack}>
        <View><Text style={themeStyle(styles.heading)}>{editingId ? 'Edit submission' : 'New submission'}</Text><Text style={themeStyle(styles.muted)}>Required fields are marked with *. Edited entries are hidden from Explorers until approved again.</Text></View>
        <View style={styles.formGrid}>
          {definition.fields.map(([key, label, type, choices]) => <View key={key} style={[styles.field, { flexBasis: width >= 1100 && key !== 'description' && key !== 'notes' ? '47%' : '100%' }]}>
            <Text style={themeStyle(styles.fieldLabel)}>{label}{type?.includes('required') ? ' *' : ''}</Text>
            {type === 'boolean' ? <ToggleSwitch accessibilityLabel={label} checked={draft[key]} onChange={value => !busy && setDraft({ ...draft, [key]: value })} /> : type === 'choice' ? <View style={styles.filters}>{choices.map(value => <Pressable key={value} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: draft[key] === value, disabled: busy }} onPress={() => setDraft({ ...draft, [key]: value })} style={themeStyle([styles.chip, draft[key] === value && styles.selected])}>{text(value)}</Pressable>)}</View> : <TextInput accessibilityLabel={label} editable={!busy} value={String(draft[key])} onChangeText={value => setDraft({ ...draft, [key]: value })} keyboardType={type?.includes('number') ? 'decimal-pad' : 'default'} multiline={key === 'description' || key === 'notes'} placeholder={`Enter ${label.toLowerCase()}`} placeholderTextColor={themeColor(colors.textMuted, 'color')} style={themeStyle([styles.input, (key === 'description' || key === 'notes') && styles.multiline])} />}
          </View>)}
        </View>
        <View style={styles.filters}><GradientButton style={styles.submitButton} label="Submit for approval" loading={busy} onPress={save} /><Pressable disabled={busy} onPress={() => setDraft(null)} accessibilityRole="button" style={styles.chip}>{text('Cancel')}</Pressable></View>
      </Card>}
      <Card style={styles.stack}>
        <View style={styles.sectionHeader}><View style={styles.flex}><Text style={themeStyle(styles.heading)}>Your submissions</Text><Text style={themeStyle(styles.muted)}>Manage entries and review their approval status.</Text></View>{action('Refresh', RefreshCw, refresh, loading || busy)}</View>
        <View style={themeStyle(styles.search)}><Search size={18} color={themeColor(colors.textMuted, 'color')} /><TextInput accessibilityLabel="Search submissions" value={search} onChangeText={setSearch} placeholder="Search this category..." placeholderTextColor={themeColor(colors.textMuted, 'color')} style={themeStyle(styles.searchInput)} /></View>
        <View style={styles.filters}>{['all', 'pending', 'approved', 'rejected'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={themeStyle([styles.chip, filter === value && styles.selected])}><Text style={themeStyle([styles.filterText, filter === value && styles.selectedText])}>{value === 'all' ? 'All entries' : value[0].toUpperCase() + value.slice(1)} / {loading ? '--' : value === 'all' ? rows.length : counts[value]}</Text></Pressable>)}</View>
      </Card>
      {loading ? <View style={styles.empty}><ActivityIndicator color={themeColor(colors.oceanBlue, 'color')} /><Text style={themeStyle(styles.muted)}>Loading submissions...</Text></View> : visibleRows.map(row => <Card key={row.id} style={styles.stack}>
        <View style={styles.sectionHeader}><View style={styles.flex}><Text style={themeStyle(styles.entryTitle)}>{row.name || (row.from ? `${row.from} to ${row.to}` : row.location)}</Text>{row.pendingDeletion ? <Text style={themeStyle(styles.muted)}>Deletion awaiting Admin review</Text> : null}</View><StatusBadge status={row.approvalStatus || 'approved'} /></View>
        {row.rejectionReason ? <View style={themeStyle([styles.banner, styles.errorBanner])}><Text style={themeStyle(styles.text)}>Admin feedback: {row.rejectionReason}</Text></View> : null}
        <View style={styles.formGrid}>{definition.fields.filter(([key]) => row[key] !== undefined && row[key] !== null && row[key] !== '').map(([key, label]) => <View key={key} style={[styles.detail, { flexBasis: width >= 1100 ? '30%' : '100%' }]}><Text style={themeStyle(styles.detailLabel)}>{label}</Text><Text style={themeStyle(styles.text)}>{typeof row[key] === 'boolean' ? row[key] ? 'Yes' : 'No' : String(row[key])}</Text></View>)}</View>
        <View style={themeStyle(styles.entryActions)}>{action('Edit / resubmit', Pencil, () => edit(row), busy)}{action('Request deletion', Trash2, () => setDeleteId(row.id), busy || row.pendingDeletion, true)}</View>
        {deleteId === row.id && <View style={themeStyle([styles.banner, styles.confirmation])}><Text style={themeStyle(styles.text)}>Request deletion? This entry will be hidden while Admin reviews it.</Text><GradientButton label="Confirm deletion request" loading={busy} onPress={remove} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => setDeleteId(null)} style={styles.chip}>{text('Cancel')}</Pressable></View>}
      </Card>)}
      {!loading && !visibleRows.length && <Card style={styles.empty}><Inbox size={32} color={themeColor(colors.textMuted, 'color')} /><Text style={themeStyle(styles.heading)}>{search.trim() ? 'No matching submissions' : 'No submissions yet'}</Text><Text style={[themeStyle(styles.muted), { textAlign: 'center' }]}>{search.trim() || filter !== 'all' ? 'Try another search or approval status.' : 'Create your first submission using the New submission button above.'}</Text></Card>}
    </View>
  </LGUPage>
}
const styles = StyleSheet.create({
  stack: { gap: 20 }, flex: { flex: 1, minWidth: 0 }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  overview: { flexDirection: 'row', gap: 20, alignItems: 'stretch' }, vertical: { flexDirection: 'column' }, guide: { flex: 1, gap: 16, justifyContent: 'center' },
  guideIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.oceanBlueLight, alignItems: 'center', justifyContent: 'center' },
  guideNote: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
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
  confirmation: { flexDirection: 'column', alignItems: 'stretch' }, empty: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 }, submitButton: { width: 240, maxWidth: '100%' },
})
