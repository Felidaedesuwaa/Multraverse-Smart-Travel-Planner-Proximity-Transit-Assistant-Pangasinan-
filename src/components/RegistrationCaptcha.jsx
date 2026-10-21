import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { api } from '../lib/api';
import { colors } from '../theme/colors';
import { useAppTheme } from '../theme/useAppTheme';
import CaptchaChallenge from './CaptchaChallenge';

export default function RegistrationCaptcha({ proof, onVerified, disabled }) {
  const { themeStyle } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const verifying = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  // Requests only outlive this component when the registration screen is left.
  // The callback below never updates a screen that has already unmounted.
  const verify = async token => {
    if (verifying.current || proof) return;
    verifying.current = true; setChecking(true); setError('');
    try {
      const result = await api.verifyCaptcha(token);
      if (mounted.current) { onVerified(result); setOpen(false); }
    } catch (failure) {
      if (mounted.current) setError(failure.message || 'Verification failed. Close the challenge and try again.');
    } finally {
      verifying.current = false;
      if (mounted.current) setChecking(false);
    }
  };
  return <View style={styles.wrapper}>
    <Pressable
      accessibilityRole="checkbox" accessibilityLabel="Prove you're not a bot"
      accessibilityState={{ checked: !!proof, disabled: !!proof || disabled }}
      disabled={!!proof || disabled}
      onPress={() => { setError(''); setOpen(true); }}
      style={[styles.row, disabled && !proof && styles.disabled]}
    >
      <View style={[styles.checkbox, proof && styles.checked]}>{proof && <Check size={17} color={colors.white} strokeWidth={3} />}</View>
      <Text style={themeStyle(styles.label)}>Prove you're not a bot</Text>
    </Pressable>
    {!!proof && <Text accessibilityLiveRegion="polite" style={themeStyle(styles.hint)}>Verified. {Platform.OS === 'web' ? 'Refresh the page' : 'Reopen registration'} to reset this check.</Text>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => { if (!verifying.current) setOpen(false); }}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal style={themeStyle(styles.card)}>
          <Text accessibilityRole="header" style={themeStyle(styles.title)}>Prove you're not a bot</Text>
          <Text style={themeStyle(styles.description)}>Complete the security check below.</Text>
          {open && !error && <CaptchaChallenge onToken={verify} onError={message => { if (!verifying.current) setError(message); }} />}
          {checking && <View accessibilityLiveRegion="polite" style={styles.progress}><ActivityIndicator color={colors.sunsetCoral} /><Text style={themeStyle(styles.label)}>Verifying…</Text></View>}
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <Pressable accessibilityRole="button" disabled={checking} onPress={() => setOpen(false)} style={styles.close}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 12, gap: 12, borderWidth: 1, borderColor: '#668C9D', borderRadius: 10 },
  disabled: { opacity: 0.5 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.sunsetCoral, alignItems: 'center', justifyContent: 'center' },
  checked: { backgroundColor: colors.sunsetCoral },
  label: { fontFamily: 'DMSans', color: colors.white, fontSize: 14, flexShrink: 1 },
  hint: { color: '#A9C4D4', fontSize: 12, lineHeight: 18, marginTop: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.oceanBlueDark, padding: 16, borderRadius: 16 },
  title: { fontFamily: 'Poppins', fontSize: 19, color: colors.white },
  description: { fontFamily: 'DMSans', fontSize: 14, color: '#A9C4D4', marginVertical: 12 },
  progress: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12 },
  error: { color: '#FF9B85', fontSize: 14, lineHeight: 21, marginTop: 12 },
  close: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  closeText: { color: colors.sunsetCoral, fontFamily: 'Poppins', fontWeight: '600' },
});
