import { useAppTheme } from "../theme/useAppTheme";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
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

  if (mfa) return <LoginLayout title="Verify your authenticator" subtitle="Administrator and LGU accounts require two-factor authentication." onBack={() => { setMfa(null); setCode(""); setFormError(null); }}>
    {mfa.setupRequired && <>
      <Text style={themeStyle(styles.footerText)}>Add an account in your authenticator app. Choose a time-based key and enter this setup key. Keep your authenticator backed up; password recovery does not remove this protection.</Text>
      <Text selectable style={themeStyle(styles.footerText)}>{mfa.secret}</Text>
      <Text style={themeStyle(styles.footerText)}>Account: Multraverse ({email})</Text>
    </>}
    <AuthInput label="Authenticator code" value={code} onChangeText={value => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} error={formError} editable={!verifying} onSubmitEditing={verify} />
    <TravelButton label="Verify & Sign In" loading={verifying} onPress={verify} />
  </LoginLayout>;

  return (
    <LoginLayout
      title="Welcome back"
      subtitle="Sign in to continue planning your Pangasinan trip."
      onBack={() => navigation.reset({ index: 0, routes: [{ name: "Landing" }] })}
      footer={<><Text style={themeStyle(styles.footerText)}>New adventures start here.</Text><Pressable accessibilityRole="button" accessibilityLabel="Sign up" onPress={() => navigation.navigate("Register")} style={styles.signup}><Text style={styles.footerLink}>Create an account →</Text></Pressable></>}
    >
      <AuthInput label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoComplete="email" editable={!isLoading} />
      <AuthInput label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} error={errors.password} isPassword autoComplete="current-password" editable={!isLoading} returnKeyType="go" onSubmitEditing={handleSubmit} />
      {formError ? <Text accessibilityRole="alert" style={themeStyle(styles.formError)}>{formError}</Text> : null}
      <TravelButton label="Sign In" loading={isLoading} onPress={handleSubmit} />
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ForgotPassword")} disabled={isLoading} style={styles.signup}><Text style={[styles.footerLink, { textAlign: "center" }]}>Forgot password?</Text></Pressable>
    </LoginLayout>
  );
}

const styles = StyleSheet.create({
  footerText: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center" },
  footerLink: { fontFamily: "Poppins", fontWeight: "600", color: "#F5BC92", fontSize: 14 },
  signup: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  formError: { fontFamily: "DMSans", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 },
});
