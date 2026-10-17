import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Check, ChevronDown, ChevronUp, Copy, Info, KeyRound, UserPlus } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { WorkspaceButton, WorkspacePanel, ui } from './SuperAdminWorkspace'
import SuperAdminSelect from './SuperAdminSelect'
import { lguMunicipalities } from '../data/lguMunicipalities'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'

export default function SuperAdminAccountForm({ type, onCreated }) {
  const { palette: p } = useAppTheme()
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [showSignInGuide, setShowSignInGuide] = useState(false)
  const [municipality, setMunicipality] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const submit = async () => {
    if (busy) return
    setMessage(''); setError(''); setTemporaryPassword(''); setCopied(false); setCopyError('')
    if (!firstName.trim() || !surname.trim()) { setError('Enter the first name and surname of the account holder.'); return }
    if (email.trim().length > 254 || !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email.trim())) { setError(`Use an email-formatted sign-in ID, such as ${type === 'lgu' ? 'lgu.dagupan@multraverse.ph' : 'admin.juan.delacruz@multraverse.ph'}`); return }
    if (type === 'admin' && !/^admin\.[a-z0-9]+(?:[._-][a-z0-9]+)*@/i.test(email.trim())) { setError('Include the administrator name in the email, such as admin.juan.delacruz@multraverse.ph. Each account needs a unique email.'); return }
    setBusy(true)
    try {
      const user = await api.createManagedAccount(type, { firstName: firstName.trim(), surname: surname.trim(), email: email.trim(), ...(type === 'lgu' ? { municipality } : {}) })
      setMessage(`Account created: ${user.email}`); setTemporaryPassword(user.temporaryPassword); setFirstName(''); setSurname(''); setEmail(''); setMunicipality('')
      onCreated?.(user)
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  const dismissPassword = () => {
    setTemporaryPassword(''); setMessage(''); setCopied(false); setCopyError('')
  }
  const copyPassword = async () => {
    setCopyError('')
    try {
      const success = await Clipboard.setStringAsync(temporaryPassword)
      if (success === false) throw new Error('Clipboard unavailable')
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('Could not copy. Select the password and copy it manually.')
    }
  }
  const labelStyle = [ui.buttonText, { color: p.ink }]
  const inputStyle = [ui.input, { color: p.ink, backgroundColor: p.background, borderColor: p.line }]
  return <WorkspacePanel style={{ width: '100%', maxWidth: 760 }}>
    <View style={{ gap: 5 }}><Text style={[ui.heading, { color: p.ink }]}>New {type === 'lgu' ? 'LGU' : 'Admin'} account</Text><Text style={[ui.caption, { color: p.muted }]}>Enter the name and email{type === 'lgu' ? ' and municipality access' : ' for a content reviewer'}.</Text></View>
    <Modal visible={!!temporaryPassword} transparent animationType="fade" onRequestClose={dismissPassword}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 520, maxHeight: '90%', borderRadius: 18, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }}>
          <ScrollView contentContainerStyle={{ gap: 16, padding: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><KeyRound size={22} color={p.primary} /><Text style={[ui.heading, { color: p.ink, flexShrink: 1 }]}>Copy this temporary password</Text></View>
      <Text style={[ui.caption, { color: p.muted }]}>{message}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line }}>
        <Text selectable style={[ui.body, { color: p.ink, flex: 1, fontWeight: '700', letterSpacing: 0.5 }]}>{temporaryPassword}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={copied ? 'Copy temporary password again' : 'Copy temporary password'} accessibilityHint="Copies the temporary password to your clipboard" onPress={copyPassword} style={({ pressed }) => ({ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: p.tint, opacity: pressed ? 0.65 : 1 })}>
          {copied ? <Check size={20} color={p.primary} /> : <Copy size={20} color={p.primary} />}
        </Pressable>
      </View>
      <Text style={[ui.buttonText, { color: p.ink }]}>Shown only once. Copy it before closing this pop-up.</Text>
      <Text style={[ui.caption, { color: p.muted }]}>Share it privately with the account holder. They must change it on first sign-in. You cannot view this password again after closing this pop-up.</Text>
      {copied || copyError ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[ui.caption, { color: copyError ? p.accent : p.ink }]}>{copyError || 'Password copied to clipboard.'}</Text> : null}
      <WorkspaceButton primary label="Done, close" onPress={dismissPassword} />
          </ScrollView>
        </View>
      </View>
    </Modal>
    <View style={{ gap: 8 }}><Text style={labelStyle}>First name</Text><TextInput accessibilityLabel="First name" placeholder="Juan" placeholderTextColor={p.muted} value={firstName} onChangeText={setFirstName} maxLength={35} autoCapitalize="words" editable={!busy} style={inputStyle} /></View>
    <View style={{ gap: 8 }}><Text style={labelStyle}>Surname</Text><TextInput accessibilityLabel="Surname" placeholder="Dela Cruz" placeholderTextColor={p.muted} value={surname} onChangeText={setSurname} maxLength={35} autoCapitalize="words" editable={!busy} style={inputStyle} /></View>
    <View style={{ gap: 8 }}><Text style={labelStyle}>Email address</Text><TextInput accessibilityLabel="Email" placeholder={type === 'lgu' ? 'lgu.dagupan@multraverse.ph' : 'admin.juan.delacruz@multraverse.ph'} placeholderTextColor={p.muted} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} style={inputStyle} /></View>
    {type === 'admin' && <Text style={[ui.caption, { color: p.muted }]}>Include the administrator's name after admin., for example admin.juan.delacruz@multraverse.ph. Use a unique email for each administrator.</Text>}
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: p.line, backgroundColor: p.tint, overflow: 'hidden' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="How account sign-in works" accessibilityState={{ expanded: showSignInGuide }} onPress={() => setShowSignInGuide(value => !value)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
        <Info size={18} color={p.ink} />
        <Text style={[ui.buttonText, { color: p.ink, flex: 1 }]}>How account sign-in works</Text>
        {showSignInGuide ? <ChevronUp size={18} color={p.muted} /> : <ChevronDown size={18} color={p.muted} />}
      </Pressable>
      {showSignInGuide && <View style={{ gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: p.line }}>
        <Text style={[ui.caption, { color: p.muted }]}>Use an email-formatted sign-in ID, such as {type === 'lgu' ? 'lgu.dagupan@multraverse.ph' : 'admin.juan.delacruz@multraverse.ph'}. A working mailbox is not required.</Text>
        <Text style={[ui.caption, { color: p.muted }]}>A temporary password is generated automatically. The account holder must change it and verify an authenticator code on first sign-in.</Text>
      </View>}
    </View>
    {type === 'lgu' && <SuperAdminSelect label="Municipality" value={municipality} onChange={setMunicipality} disabled={busy} options={lguMunicipalities.map(area => ({ value: area.name, label: area.name }))} />}
    {error ? <View accessibilityRole="alert" style={{ padding: 14, borderRadius: 10, backgroundColor: p.tint }}><Text style={[ui.body, { color: p.accent }]}>{error}</Text></View> : null}
    <View style={{ alignSelf: 'flex-start' }}><WorkspaceButton primary icon={UserPlus} label={`Create ${type === 'lgu' ? 'LGU' : 'Admin'} account`} loading={busy} disabled={!firstName.trim() || !surname.trim() || !email.trim() || (type === 'lgu' && !municipality)} onPress={submit} /></View>
  </WorkspacePanel>
}
