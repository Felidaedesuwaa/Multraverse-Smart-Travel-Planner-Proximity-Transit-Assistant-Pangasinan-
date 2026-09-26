import SuperAdminToast from './SuperAdminToast'
import { useCallback, useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import Card from './Card'
import GradientButton from './GradientButton'
import ToggleSwitch from './ToggleSwitch'
import SuperAdminSelect from './SuperAdminSelect'
import { lguMunicipalities } from '../data/lguMunicipalities'
import { api } from '../lib/api'
import { useAppTheme } from '../theme/useAppTheme'

export default function SuperAdminAccountForm({ type, onCreated }) {
  const { text, surface } = useAppTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const dismissMessage = useCallback(() => setMessage(''), [])
  const submit = async () => {
    setBusy(true); setMessage('')
    try {
      const user = await api.createManagedAccount(type, { email: email.trim(), password, ...(type === 'lgu' ? { municipality } : {}) })
      setMessage(`Account created: ${user.email}`); setPassword(''); setEmail('')
      onCreated?.(user)
    } catch (error) { setMessage(error.message) } finally { setBusy(false) }
  }
  const inputStyle = { padding: 14, borderWidth: 1, borderColor: text, borderRadius: 10, color: text, backgroundColor: surface }
  return <Card style={{ gap: 14 }}>
    <Text style={{ color: text }}>Email</Text>
    <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" editable={!busy} style={inputStyle} />
    <Text style={{ color: text }}>Initial password</Text>
    <TextInput accessibilityLabel="Initial password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} editable={!busy} style={inputStyle} />
    <Text style={{ color: text }}>At least 8 characters, including uppercase, lowercase and a number.</Text>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Text style={{ color: text }}>Show password</Text><ToggleSwitch accessibilityLabel="Show password" checked={showPassword} onChange={setShowPassword} /></View>
    {type === 'lgu' && <SuperAdminSelect label="Municipality" value={municipality} onChange={setMunicipality} disabled={busy} options={lguMunicipalities.map(area => ({ value: area.name, label: area.name }))} />}
    <SuperAdminToast message={message} onDismiss={dismissMessage} />
    <GradientButton label={`Create ${type === 'lgu' ? 'LGU' : 'Admin'} account`} loading={busy} disabled={!email.trim() || !password || (type === 'lgu' && !municipality)} onPress={submit} />
  </Card>
}
