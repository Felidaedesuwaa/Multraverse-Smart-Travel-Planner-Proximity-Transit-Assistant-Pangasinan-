import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import { UserPlus } from 'lucide-react-native'
import { WorkspaceButton, WorkspacePanel, ui } from './SuperAdminWorkspace'
import ToggleSwitch from './ToggleSwitch'
import SuperAdminSelect from './SuperAdminSelect'
import { lguMunicipalities } from '../data/lguMunicipalities'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'

export default function SuperAdminAccountForm({ type, onCreated }) {
  const { palette: p } = useAppTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const submit = async () => {
    if (busy) return
    setMessage(''); setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) { setError('Use at least 8 characters with uppercase, lowercase and a number.'); return }
    setBusy(true)
    try {
      const user = await api.createManagedAccount(type, { email: email.trim(), password, ...(type === 'lgu' ? { municipality } : {}) })
      setMessage(`Account created: ${user.email}`); setPassword(''); setEmail(''); setMunicipality(''); setShowPassword(false)
      onCreated?.(user)
    } catch (error) { setError(error.message) } finally { setBusy(false) }
  }
  const labelStyle = [ui.buttonText, { color: p.ink }]
  const inputStyle = [ui.input, { color: p.ink, backgroundColor: p.background, borderColor: p.line }]
  return <WorkspacePanel style={{ width: '100%', maxWidth: 760 }}>
    <View style={{ gap: 5 }}><Text style={[ui.heading, { color: p.ink }]}>New {type === 'lgu' ? 'LGU' : 'Admin'} account</Text><Text style={[ui.caption, { color: p.muted }]}>Set up sign-in credentials{type === 'lgu' ? ' and municipality access' : ' for a content reviewer'}.</Text></View>
    <View style={{ gap: 8 }}><Text style={labelStyle}>Email address</Text><TextInput accessibilityLabel="Email" placeholder="officer@example.com" placeholderTextColor={p.muted} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} style={inputStyle} /></View>
    <View style={{ gap: 8 }}><Text style={labelStyle}>Initial password</Text><TextInput accessibilityLabel="Initial password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} editable={!busy} style={inputStyle} /><Text style={[ui.caption, { color: p.muted }]}>At least 8 characters, including uppercase, lowercase and a number.</Text></View>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><ToggleSwitch accessibilityLabel="Show password" checked={showPassword} onChange={setShowPassword} /><Text style={[ui.caption, { color: p.muted }]}>Show password</Text></View>
    {type === 'lgu' && <SuperAdminSelect label="Municipality" value={municipality} onChange={setMunicipality} disabled={busy} options={lguMunicipalities.map(area => ({ value: area.name, label: area.name }))} />}
    {error || message ? <View accessibilityRole="alert" style={{ padding: 14, borderRadius: 10, backgroundColor: p.tint }}><Text style={[ui.body, { color: error ? p.accent : p.ink }]}>{error || message}</Text></View> : null}
    <View style={{ alignSelf: 'flex-start' }}><WorkspaceButton primary icon={UserPlus} label={`Create ${type === 'lgu' ? 'LGU' : 'Admin'} account`} loading={busy} disabled={!email.trim() || !password || (type === 'lgu' && !municipality)} onPress={submit} /></View>
  </WorkspacePanel>
}
