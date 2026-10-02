import { useRef, useState } from 'react'
import { Modal, ScrollView, Text, TextInput, View } from 'react-native'
import { Pencil, Trash2 } from 'lucide-react-native'
import { WorkspaceButton, ui } from './SuperAdminWorkspace'
import { useAppTheme } from '../theme/useAppTheme'
import { api } from '../lib/api'

export default function ExplorerAccountAction({ account, mode, onClose, onSaved }) {
  const { palette: p } = useAppTheme()
  const [name, setName] = useState(account.name || '')
  const [location, setLocation] = useState(account.location || '')
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const lock = useRef(false)
  const nameInput = useRef(null)
  const deleting = mode === 'delete'
  const Icon = deleting ? Trash2 : Pencil
  const submit = async () => {
    if (lock.current) return
    const nextErrors = {}
    if (!deleting) {
      if (!name.trim() || name.trim().length > 80 || !/^\p{L}[\p{L}\p{M} .\u2019'-]*$/u.test(name.trim())) nextErrors.name = 'Enter a name using letters, spaces, initials, apostrophes or hyphens (up to 80 characters).'
      if (location.trim().length > 120) nextErrors.location = 'Use at most 120 characters for the location.'
    }
    setErrors(nextErrors); setError('')
    if (Object.keys(nextErrors).length) { nameInput.current?.focus?.(); return }
    lock.current = true; setBusy(true)
    try {
      if (deleting) await api.deleteExplorerAccount(account.id)
      else await api.updateExplorerAccount(account.id, { name: name.trim(), location: location.trim() })
      onSaved(deleting ? 'User account and personal data permanently deleted.' : 'User information updated.')
    } catch (err) { setError(err.message || 'Unable to update the account. Please try again.') }
    finally { lock.current = false; setBusy(false) }
  }
  return <Modal transparent animationType="fade" onRequestClose={() => !lock.current && onClose()}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', borderRadius: 16, backgroundColor: p.surface }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Icon size={24} color={deleting ? '#DC2626' : '#2563EB'} /><Text accessibilityRole="header" style={[ui.heading, { color: p.ink }]}>{deleting ? 'Permanently delete user?' : 'Edit user information'}</Text></View>
          <Text style={[ui.body, { color: p.muted }]}>{deleting ? `Delete ${account.name} (${account.email})? Their sign-in credentials, trips, expenses, saved places, planner drafts and geofence history will be permanently removed. This cannot be undone.` : 'Update the user’s name and location.'}</Text>
          {!deleting && <>
            <View style={{ gap: 8 }}><Text style={[ui.buttonText, { color: p.ink }]}>Name</Text><TextInput ref={nameInput} accessibilityLabel="User name" value={name} onChangeText={setName} editable={!busy} maxLength={80} placeholder="e.g. Maria R. Santos" placeholderTextColor={p.muted} style={[ui.input, { color: p.ink, backgroundColor: p.background, borderColor: errors.name ? '#DC2626' : p.line }]} />{!!errors.name && <Text accessibilityRole="alert" style={[ui.caption, { color: '#DC2626' }]}>{errors.name}</Text>}</View>
            <View style={{ gap: 8 }}><Text style={[ui.buttonText, { color: p.ink }]}>Location</Text><TextInput accessibilityLabel="User location" value={location} onChangeText={setLocation} editable={!busy} maxLength={120} placeholder="e.g. Dagupan, Pangasinan" placeholderTextColor={p.muted} style={[ui.input, { color: p.ink, backgroundColor: p.background, borderColor: errors.location ? '#DC2626' : p.line }]} />{!!errors.location && <Text accessibilityRole="alert" style={[ui.caption, { color: '#DC2626' }]}>{errors.location}</Text>}</View>
            <View style={{ gap: 4 }}><Text style={[ui.buttonText, { color: p.ink }]}>Sign-in email</Text><Text selectable style={[ui.body, { color: p.muted }]}>{account.email}</Text></View>
          </>}
          {!!error && <Text accessibilityRole="alert" style={[ui.body, { color: p.accent }]}>{error}</Text>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}><WorkspaceButton label="Cancel" disabled={busy} onPress={onClose} /><WorkspaceButton primary tone={deleting ? 'danger' : 'edit'} label={deleting ? 'Permanently delete' : 'Save changes'} icon={deleting ? Trash2 : Pencil} loading={busy} onPress={submit} /></View>
        </ScrollView>
      </View>
    </View>
  </Modal>
}
