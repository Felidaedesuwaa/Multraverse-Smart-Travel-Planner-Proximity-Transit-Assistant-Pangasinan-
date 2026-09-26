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
    setLoading(true)
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
  const text = value => <Text style={themeStyle(styles.text)}>{value}</Text>
  return <LGUPage title={definition.label}>
    <View style={styles.stack}>
      <LGUMunicipalityMap key={municipality.id} municipality={municipality} />
      <GradientButton label={`Submit ${definition.label.toLowerCase()}`} onPress={() => edit(null)} disabled={busy} />
      {error ? <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{error}</Text> : null}
      {notice ? text(notice) : null}
      {draft && <Card style={styles.stack}>
        {text(editingId ? 'Edit submission' : 'New submission')}
        {text('Saving an edit hides this entry from Explorers until it is approved again.')}
        {definition.fields.map(([key, label, type, choices]) => <View key={key} style={{ gap: 6 }}>
          {text(label)}
          {type === 'boolean' ? <ToggleSwitch accessibilityLabel={label} checked={draft[key]} onChange={value => setDraft({ ...draft, [key]: value })} /> : type === 'choice' ? <View style={styles.filters}>{choices.map(value => <Pressable key={value} accessibilityRole="button" onPress={() => setDraft({ ...draft, [key]: value })} style={themeStyle([styles.chip, draft[key] === value && styles.selected])}>{text(value)}</Pressable>)}</View> : <TextInput accessibilityLabel={label} editable={!busy} value={String(draft[key])} onChangeText={value => setDraft({ ...draft, [key]: value })} keyboardType={type?.includes('number') ? 'decimal-pad' : 'default'} multiline={key === 'description' || key === 'notes'} placeholderTextColor={themeColor(colors.textMuted, 'color')} style={themeStyle(styles.input)} />}
        </View>)}
        <GradientButton label="Submit for approval" loading={busy} onPress={save} />
        <Pressable disabled={busy} onPress={() => setDraft(null)} accessibilityRole="button">{text('Cancel')}</Pressable>
      </Card>}
      <View style={styles.filters}>{['all', 'pending', 'approved', 'rejected'].map(value => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={themeStyle([styles.chip, filter === value && styles.selected])}>{text(value)}</Pressable>)}<Pressable accessibilityRole="button" onPress={refresh} style={styles.chip}>{text('Refresh')}</Pressable></View>
      {loading ? <ActivityIndicator /> : rows.filter(row => filter === 'all' || (row.approvalStatus || 'approved') === filter).map(row => <Card key={row.id} style={styles.stack}>
        {text(row.name || (row.from ? `${row.from} ? ${row.to}` : row.location))}
        <StatusBadge status={row.approvalStatus || 'approved'} />
        {row.pendingDeletion ? text('Deletion requested') : null}
        {row.rejectionReason ? text(`Admin feedback: ${row.rejectionReason}`) : null}
        {definition.fields.filter(([key]) => row[key] !== undefined && row[key] !== null).map(([key, label]) => <Text key={key} style={themeStyle(styles.text)}>{label}: {String(row[key])}</Text>)}
        <View style={styles.filters}><Pressable disabled={busy} accessibilityRole="button" onPress={() => edit(row)} style={styles.chip}>{text('Edit / resubmit')}</Pressable><Pressable disabled={busy || row.pendingDeletion} accessibilityRole="button" onPress={() => setDeleteId(row.id)} style={styles.chip}>{text('Request deletion')}</Pressable></View>
        {deleteId === row.id && <><Text style={themeStyle(styles.text)}>Request deletion? This entry will be hidden while Admin reviews it.</Text><GradientButton label="Confirm deletion request" loading={busy} onPress={remove} /><Pressable onPress={() => setDeleteId(null)}>{text('Cancel')}</Pressable></>}
      </Card>)}
      {!loading && !rows.some(row => filter === 'all' || (row.approvalStatus || 'approved') === filter) ? text('No entries for this status.') : null}
    </View>
  </LGUPage>
}
const styles = StyleSheet.create({
  stack: { gap: 14 }, text: { color: colors.oceanBlue, fontFamily: 'DMSans' }, error: { color: '#B42318' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, color: colors.oceanBlue, backgroundColor: colors.white },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { padding: 10, borderRadius: 10 }, selected: { backgroundColor: colors.coralLight },
})
