import { useAppTheme } from "../theme/useAppTheme";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import AuthInput from "../components/AuthInput";
import AuthLayout from "../components/AuthLayout";
import GradientButton from "../components/GradientButton";
import { useAuthStore } from "../store/authStore";
import { normalizeName, registrationFullName, validateRegistration } from "../utils/validation";
import { api } from "../lib/api";

export default function RegisterPage() {
  const { themeStyle } = useAppTheme();

  const navigation = useNavigation();
  const { register, verifyRegistration, isLoading } = useAuthStore();
  const [pending, setPending] = useState(null);
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const submitting = useRef(false);
  const fields = { firstName, middleName, surname, email, password, confirm };
  const fullName = registrationFullName(firstName, middleName, surname);
  const validateField = field => setErrors(current => ({ ...current, [field]: validateRegistration(fields)[field] }));
  const change = (field, setter) => value => {
    setter(value); setFormError(null);
    setErrors(current => ({ ...current, [field]: current[field] ? validateRegistration({ ...fields, [field]: value })[field] : null, ...(field === "password" ? { confirm: null } : {}) }));
  };

  const handleSubmit = async () => {
    if (submitting.current || isLoading) return;
    const validation = validateRegistration(fields);
    setErrors(validation);
    setFormError(null);
    if (Object.values(validation).some(Boolean)) return;

    submitting.current = true;
    try {
      const success = await register({ firstName: normalizeName(firstName), middleName: normalizeName(middleName), surname: normalizeName(surname), email: email.trim().toLowerCase(), password });
      if (success) {
        setPending(success); setPassword(""); setConfirm(""); setNow(Date.now());
      }
      else {
        setFormError(useAuthStore.getState().error);
        setErrors(current => ({ ...current, ...useAuthStore.getState().fieldErrors }));
      }
    } finally { submitting.current = false; }
  };

  const verify = async () => {
    if (submitting.current || isLoading || resending) return;
    if (!/^\d{6}$/.test(code)) { setFormError("Enter the six-digit code from your email."); return; }
    submitting.current = true;
    setFormError(null);
    try {
      if (await verifyRegistration(pending.challengeId, code)) navigation.reset({ index: 0, routes: [{ name: "User" }] });
      else setFormError(useAuthStore.getState().error);
    } finally { submitting.current = false; }
  };
  const resend = async () => {
    if (submitting.current || resending || isLoading) return;
    submitting.current = true; setResending(true); setFormError(null); setNotice("");
    try {
      setPending(await api.resendRegistration(pending.challengeId));
      setCode(""); setNow(Date.now()); setNotice("A new code has been sent. Use the latest email.");
    } catch (error) { setFormError(error.message); }
    finally { submitting.current = false; setResending(false); }
  };
  if (pending) {
    const wait = Math.max(0, Math.ceil((new Date(pending.resendAt).getTime() - now) / 1000));
    const expired = now >= new Date(pending.expiresAt).getTime();
    return <AuthLayout title="Verify your email" subtitle={`Step 2 of 2 · We sent a code to ${email.trim().toLowerCase()}`}>
      <Text style={themeStyle(styles.namePreview)}>Check your inbox and spam folder. Your account will be created after verification.</Text>
      <AuthInput label="Verification code" placeholder="Enter 6-digit code" value={code} onChangeText={value => { setCode(value.replace(/\D/g, "").slice(0, 6)); setFormError(null); }} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} autoFocus editable={!isLoading && !resending} onSubmitEditing={verify} error={formError} hint={expired ? "This code has expired. Request a new code below." : "Your code expires in 10 minutes and can only be used once."} />
      <GradientButton label="Verify & Create Account" onPress={verify} loading={isLoading} disabled={resending || expired} />
      {!!notice && <Text accessibilityLiveRegion="polite" style={themeStyle(styles.notice)}>{notice}</Text>}
      <View style={styles.codeActions}>
        <Pressable accessibilityRole="button" disabled={wait > 0 || isLoading || resending} onPress={resend} style={styles.codeAction}><Text style={themeStyle(styles.footerLink)}>{resending ? "Sending…" : wait ? `Resend code in ${wait}s` : "Resend code"}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={isLoading || resending} onPress={() => { setPending(null); setCode(""); setFormError(null); setNotice(""); }} style={styles.codeAction}><Text style={themeStyle(styles.footerLink)}>Edit signup details</Text></Pressable>
      </View>
    </AuthLayout>;
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Step 1 of 2 · Enter your details, then verify your email."
      footer={<Text style={themeStyle(styles.footerText)}>Already have an account? <Text style={themeStyle(styles.footerLink)} onPress={() => navigation.navigate("Login")}>Sign in</Text></Text>}
    >
      <AuthInput label="First name" placeholder="e.g. Juan" value={firstName} onChangeText={change("firstName", setFirstName)} onBlur={() => validateField("firstName")} error={errors.firstName} autoCapitalize="words" autoComplete="given-name" editable={!isLoading} />
      <AuthInput label="Middle name (optional)" placeholder="e.g. Reyes" hint="Saved as an initial: Reyes becomes R. Leave blank if you have no middle name." value={middleName} onChangeText={change("middleName", setMiddleName)} onBlur={() => validateField("middleName")} error={errors.middleName} autoCapitalize="words" autoComplete="additional-name" editable={!isLoading} />
      <AuthInput label="Surname" placeholder="e.g. dela Cruz" value={surname} onChangeText={change("surname", setSurname)} onBlur={() => validateField("surname")} error={errors.surname} autoCapitalize="words" autoComplete="family-name" editable={!isLoading} />
      {!!firstName.trim() && !!surname.trim() && <Text style={themeStyle(styles.namePreview)}>Full name: {fullName}</Text>}
      <AuthInput label="Email" placeholder="e.g. juan.delacruz@gmail.com" hint="Use your own active email address. Example and test domains are not accepted." value={email} onChangeText={change("email", setEmail)} onBlur={() => validateField("email")} error={errors.email} keyboardType="email-address" autoComplete="email" editable={!isLoading} />
      <AuthInput label="Password" placeholder="e.g. Lakbay_2026 (use your own)" hint="8–72 characters, at least one capital letter and one number. Only letters, numbers, _, - and @; no spaces." value={password} onChangeText={change("password", setPassword)} onBlur={() => validateField("password")} error={errors.password} isPassword autoComplete="new-password" editable={!isLoading} />
      <AuthInput label="Confirm password" placeholder="Repeat your chosen password" value={confirm} onChangeText={change("confirm", setConfirm)} onBlur={() => validateField("confirm")} error={errors.confirm} isPassword autoComplete="new-password" editable={!isLoading} onSubmitEditing={handleSubmit} />
      {formError ? <Text accessibilityRole="alert" style={themeStyle(styles.formError)}>{formError}</Text> : null}
      <GradientButton label="Register" loading={isLoading} onPress={handleSubmit} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  codeActions: { marginTop: 16, gap: 6, alignItems: "center" },
  codeAction: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  notice: { fontSize: 13, color: "#A9C4D4", marginTop: 14, textAlign: "center" },
  namePreview: { fontFamily: "DMSans", fontSize: 13, color: "#A9C4D4", marginBottom: 18 },
  footerText: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center" },
  footerLink: { fontFamily: "Poppins", fontWeight: "600", color: colors.sunsetCoral },
  formError: { fontFamily: "DMSans", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 },
});
