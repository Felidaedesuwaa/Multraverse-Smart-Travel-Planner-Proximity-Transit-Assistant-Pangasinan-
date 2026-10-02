import { useState } from 'react'
import { Modal, ScrollView, Text, TextInput, View } from 'react-native'
import { WorkspaceButton, ui } from './SuperAdminWorkspace'
import SuperAdminSelect from './SuperAdminSelect'
import { lguMunicipalities } from '../data/lguMunicipalities'
import { useAppTheme } from '../theme/useAppTheme'
import { api } from '../lib/api'

export default function SuperAdminAccountAction({ account, type, mode, onClose, onSaved }) {
  const { palette: p } = useAppTheme()
  const [email, setEmail] = useState(account.email)
  const [municipality, setMunicipality] = useState(account.municipality || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const deleting = mode === 'delete'
  const submit = async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      if (deleting) await api.deleteManagedAccount(type, account.id)
      else await api.updateManagedAccount(type, account.id, { email: email.trim(), ...(type === 'lgu' ? { municipality } : {}) })
      onSaved(deleting ? `Deleted ${account.email}.` : 'Account updated.')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Modal transparent animationType="fade" onRequestClose={() => !busy && onClose()}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', borderRadius: 16, backgroundColor: p.surface }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          <Text style={[ui.heading, { color: p.ink }]}>{deleting ? 'Delete account?' : 'Edit account'}</Text>
          <Text style={[ui.body, { color: p.muted }]}>{deleting ? `Permanently delete ${account.email}? Sign-in access and personal account data will be removed. Shared municipal content and audit history will remain. This cannot be undone.` : 'Update the account email and assigned access. The existing password stays unchanged.'}</Text>
          {!deleting && <>
            <View style={{ gap: 8 }}><Text style={[ui.buttonText, { color: p.ink }]}>Email address</Text><TextInput accessibilityLabel="Account email" value={email} onChangeText={setEmail} editable={!busy} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" style={[ui.input, { color: p.ink, borderColor: p.line, backgroundColor: p.background }]} /></View>
            {type === 'lgu' && <SuperAdminSelect label="Municipality" value={municipality} onChange={setMunicipality} disabled={busy} options={lguMunicipalities.map(area => ({ value: area.name, label: area.name }))} />}
          </>}
          {error ? <Text accessibilityRole="alert" style={[ui.body, { color: p.accent }]}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-end' }}><WorkspaceButton label="Cancel" disabled={busy} onPress={onClose} /><WorkspaceButton primary label={deleting ? 'Delete account' : 'Save changes'} loading={busy} disabled={!deleting && (!email.trim() || (type === 'lgu' && !municipality))} onPress={submit} /></View>
        </ScrollView>
      </View>
    </View>
  </Modal>
}
