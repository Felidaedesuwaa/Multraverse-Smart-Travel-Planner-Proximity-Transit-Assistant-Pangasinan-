import { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AuthInput from '../components/AuthInput';
import LoginLayout from '../components/LoginLayout';
import { TravelButton } from '../components/SummerUI';
import { useAuthStore } from '../store/authStore';
import { useAppTheme } from '../theme/useAppTheme';
import { api } from '../lib/api';
import { notifyUpdates } from '../lib/notificationEvents';
import { returnToDashboard } from '../lib/dashboardNavigation';
import { validatePassword } from '../utils/validation';

export default function PasswordRecoveryPage() {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  const { themeStyle } = useAppTheme();
  const [challenge, setChallenge] = useState(null), [grant, setGrant] = useState(null);
  const [code, setCode] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [resendAt, setResendAt] = useState(0), [now, setNow] = useState(Date.now());
  const lock = useRef(false), mounted = useRef(true);
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  async function send() {
    if (lock.current || Date.now() < resendAt) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await api.requestRecoveryCode();
      if (!mounted.current) return;
      setChallenge(result); setGrant(null); setCode(''); setPassword(''); setMessage(result.message);
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
    } catch (failure) {
      if (mounted.current) { setError(failure.message); if (failure.retryAfter) setResendAt(Date.now() + failure.retryAfter * 1000); }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  useEffect(() => {
    mounted.current = true;
    send();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);
  async function submit() {
    if (lock.current) return;
    const invalid = grant ? validatePassword(password) : /^\d{6}$/.test(code) ? null : 'Enter the six-digit code from your email.';
    if (invalid) { setError(invalid); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      if (!grant) {
        const result = await api.verifyPasswordReset(challenge.challengeId, code);
        if (mounted.current) { setGrant(result.grantToken); setCode(''); setMessage(result.message); }
      } else {
        const session = await api.recoverPassword(grant, password);
        await useAuthStore.getState().acceptSession(session);
        setPassword(''); setGrant(null); notifyUpdates();
        returnToDashboard(navigation, session.user.role);
      }
    } catch (failure) { if (mounted.current) setError(failure.fieldErrors?.newPassword || failure.message); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  const textStyle = themeStyle({ color: '#A9C4D4', fontSize: 14, lineHeight: 21, marginBottom: 16 });
  const back = () => { if (!lock.current) returnToDashboard(navigation, user?.role); };
  return <LoginLayout title={grant ? 'Choose a new password' : 'Verify your email'} subtitle={grant ? 'Your email is verified. Set your new password to secure your account.' : `We’ll send a verification code to ${user?.email || 'your account email'}.`} onBack={back} backLabel="Back to Dashboard">
    {!!message && <Text accessibilityLiveRegion="polite" style={textStyle}>{message}</Text>}
    {grant ? <AuthInput label="New password" value={password} onChangeText={setPassword} isPassword autoComplete="new-password" maxLength={72} editable={!busy} hint="8–72 characters, including an uppercase letter and a number. Use letters, numbers, _, - and @." returnKeyType="go" onSubmitEditing={submit} /> : challenge && <AuthInput label="Verification code" value={code} onChangeText={value => setCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} editable={!busy} returnKeyType="go" onSubmitEditing={submit} />}
    {!!error && <Text accessibilityRole="alert" style={themeStyle({ color: '#FF9B85', marginBottom: 16, lineHeight: 20 })}>{error}</Text>}
    <TravelButton label={grant ? 'Save new password' : challenge ? 'Verify code' : 'Send verification code'} loading={busy} onPress={grant || challenge ? submit : send} disabled={!challenge && seconds > 0} />
    <Pressable accessibilityRole="button" disabled={busy || seconds > 0} onPress={send} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Text style={textStyle}>{seconds > 0 ? `Resend code in ${seconds}s` : grant ? 'Verify email again' : 'Resend code'}</Text></Pressable>
  </LoginLayout>;
}
