import { useAppTheme } from "../theme/useAppTheme";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, ChevronUp, ShieldCheck } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import AuthInput from "../components/AuthInput";
import LoginLayout from "../components/LoginLayout";
import { TravelButton } from "../components/SummerUI";
import { useAuthStore } from "../store/authStore";
import { validateEmail } from "../utils/validation";
import { api } from "../lib/api";

export default function LoginPage() {
  const { themeStyle } = useAppTheme();

  const navigation = useNavigation();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [mfa, setMfa] = useState(null);
  const [showAuthenticatorSetup, setShowAuthenticatorSetup] = useState(false);
  const [firstSignIn, setFirstSignIn] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async () => {
    if (submitting.current || isLoading) return;
    const emailError = validateEmail(email);
    const passwordError = password ? null : "Password is required";
    setErrors({ email: emailError, password: passwordError });
    setFormError(null);
    if (emailError || passwordError) return;

    submitting.current = true;
    try {
      const success = await login(email.trim(), password);
      if (success?.passwordChangeRequired) {
        setFirstSignIn({ challengeToken: success.challengeToken, currentPassword: password });
        setPassword("");
        return;
      }
      if (success?.mfaRequired) {
        setPassword("");
        const setup = await api.setupMfa(success.challengeToken);
        setMfa({ ...success, ...setup });
        return;
      }
      if (success) {
        const role = useAuthStore.getState().user?.role;
        navigation.reset({ index: 0, routes: [{ name: role === "SUPERADMIN" ? "SuperAdmin" : role === "ADMIN" ? "Admin" : role === "LGU" ? "LGU" : "User" }] });
      } else setFormError(useAuthStore.getState().error);
    } catch (error) { setFormError(error.message); }
    finally { submitting.current = false; }
  };

  const completeFirstSignIn = async () => {
    if (submitting.current) return;
    setFormError(null);
    if (newPassword !== confirmPassword) { setFormError("Passwords do not match."); return; }
    submitting.current = true; setVerifying(true);
    try {
      const result = await api.completeFirstSignIn(firstSignIn.challengeToken, firstSignIn.currentPassword, newPassword);
      setFirstSignIn(null); setNewPassword(""); setConfirmPassword("");
      const setup = await api.setupMfa(result.challengeToken);
      setMfa({ ...result, ...setup });
    } catch (error) { setFormError(error.message); }
    finally { submitting.current = false; setVerifying(false); }
  };

  const verify = async () => {
    if (submitting.current) return;
    submitting.current = true; setVerifying(true); setFormError(null);
    try {
      const session = await api.verifyMfa(mfa.challengeToken, code);
      await useAuthStore.getState().acceptSession(session);
      const role = session.user.role;
      navigation.reset({ index: 0, routes: [{ name: role === "SUPERADMIN" ? "SuperAdmin" : role === "ADMIN" ? "Admin" : "LGU" }] });
    } catch (error) { setFormError(error.message); }
    finally { submitting.current = false; setVerifying(false); }
  };

  if (firstSignIn) return <LoginLayout title="Choose your own password" subtitle="Replace your temporary password before continuing." onBack={() => { if (!verifying) { setFirstSignIn(null); setNewPassword(""); setConfirmPassword(""); setFormError(null); } }}>
    <Text style={themeStyle(styles.footerText)}>Use at least 8 characters with uppercase, lowercase and a number. Allowed symbols: _ - @.</Text>
    <AuthInput label="New password" value={newPassword} onChangeText={setNewPassword} isPassword autoComplete="new-password" editable={!verifying} />
    <AuthInput label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} isPassword autoComplete="new-password" editable={!verifying} onSubmitEditing={completeFirstSignIn} />
    {formError ? <Text accessibilityRole="alert" style={themeStyle(styles.formError)}>{formError}</Text> : null}
    <TravelButton label="Save password & Continue" loading={verifying} onPress={completeFirstSignIn} />
  </LoginLayout>;

  if (mfa) return <LoginLayout title={mfa.setupRequired ? 'Set up your authenticator' : 'Verify your authenticator'} subtitle={mfa.setupRequired ? 'One more step to secure your account before signing in.' : 'Enter the six-digit code from your authenticator app.'} onBack={() => { setMfa(null); setCode(""); setFormError(null); }}>
    {mfa.setupRequired && <View style={styles.setupCard}>
      <Pressable accessibilityRole="button" accessibilityLabel="Connect your authenticator" accessibilityState={{ expanded: showAuthenticatorSetup }} onPress={() => setShowAuthenticatorSetup(value => !value)} style={styles.setupHeader}>
        <ShieldCheck size={22} color="#A9DCD2" />
        <Text style={styles.setupTitle}>Connect your authenticator</Text>
        {showAuthenticatorSetup ? <ChevronUp size={20} color="#A9DCD2" /> : <ChevronDown size={20} color="#A9DCD2" />}
      </Pressable>
      {showAuthenticatorSetup && <>
      <Text style={styles.setupText}>1. Open your authenticator app and add an account manually.</Text>
      <Text style={styles.setupText}>2. Enter the account details below and choose Time-based (TOTP).</Text>
      <View style={styles.setupDetails}>
        <Text style={styles.setupLabel}>Account name</Text>
        <Text selectable style={styles.setupValue}>Multraverse ({email.trim()})</Text>
        <Text style={styles.setupLabel}>Setup key</Text>
        <Text selectable style={styles.setupKey}>{mfa.secret?.match(/.{1,4}/g)?.join(' ')}</Text>
      </View>
      <Text style={styles.setupText}>3. Enter the six-digit code shown in your app below to finish setup.</Text>
      <Text style={styles.setupNote}>Keep your setup key private and back up your authenticator. Changing your password will not reset your authenticator.</Text>
      </>}
    </View>}
    <AuthInput label="Authenticator code" value={code} onChangeText={value => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} error={formError} editable={!verifying} onSubmitEditing={verify} />
    <TravelButton label="Verify & Sign In" loading={verifying} onPress={verify} />
  </LoginLayout>;

  return (
    <LoginLayout
      title="Welcome back"
      subtitle="Sign in to continue planning your Pangasinan trip."
      onBack={() => navigation.reset({ index: 0, routes: [{ name: "Landing" }] })}
      footer={<><Text style={themeStyle(styles.footerText)}>New adventures start here.</Text><Pressable accessibilityRole="button" accessibilityLabel="Sign up" onPress={() => navigation.navigate("Register")} style={styles.signup}><Text style={styles.footerLink}>Create an account {"\u2192"}</Text></Pressable></>}
    >
      <AuthInput label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoComplete="email" editable={!isLoading} />
      <AuthInput label="Password" value={password} onChangeText={setPassword} error={errors.password} isPassword autoComplete="current-password" editable={!isLoading} returnKeyType="go" onSubmitEditing={handleSubmit} />
      {formError ? <Text accessibilityRole="alert" style={themeStyle(styles.formError)}>{formError}</Text> : null}
      <TravelButton label="Sign In" loading={isLoading} onPress={handleSubmit} />
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ForgotPassword")} disabled={isLoading} style={styles.signup}><Text style={[styles.footerLink, { textAlign: "center" }]}>Forgot password?</Text></Pressable>
    </LoginLayout>
  );
}

const styles = StyleSheet.create({
  setupCard: { padding: 18, gap: 14, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(169,220,210,0.3)', backgroundColor: 'rgba(169,220,210,0.07)', marginBottom: 8 },
  setupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  setupTitle: { flex: 1, fontFamily: 'Poppins', fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  setupText: { fontFamily: 'DMSans', fontSize: 14, lineHeight: 22, color: '#D5E6EB' },
  setupDetails: { padding: 14, gap: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.13)' },
  setupLabel: { fontFamily: 'DMSans', fontSize: 12, fontWeight: '700', color: '#A9C4D4' },
  setupValue: { fontFamily: 'DMSans', fontSize: 14, lineHeight: 22, color: '#FFFFFF', marginBottom: 6 },
  setupKey: { fontFamily: 'DMSans', fontSize: 16, lineHeight: 26, fontWeight: '700', letterSpacing: 1, color: '#FFFFFF' },
  setupNote: { fontFamily: 'DMSans', fontSize: 12, lineHeight: 19, color: '#A9C4D4' },
  footerText: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center" },
  footerLink: { fontFamily: "Poppins", fontWeight: "600", color: "#F5BC92", fontSize: 14 },
  signup: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  formError: { fontFamily: "DMSans", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 },
});
