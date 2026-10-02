import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AuthInput from "../components/AuthInput";
import LoginLayout from "../components/LoginLayout";
import { TravelButton } from "../components/SummerUI";
import { api } from "../lib/api";
import { useAppTheme } from "../theme/useAppTheme";
import { validateEmail, validatePassword, validateConfirmPassword } from "../utils/validation";

export default function ForgotPasswordPage() {
  const navigation = useNavigation();
  const { themeStyle } = useAppTheme();
  const [email, setEmail] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [newPassword, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const lock = useRef(false);
  const inputs = useRef({});
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const seconds = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const back = () => { if (!lock.current) navigation.navigate("Login"); };
  const focusError = fields => { const key = Object.keys(fields).find(k => fields[k]); if (key) inputs.current[key]?.focus(); };
  const sendCode = async () => {
    if (lock.current || seconds > 0) return;
    const fields = { email: validateEmail(email) };
    setErrors(fields); setFailure("");
    if (fields.email) { focusError(fields); return; }
    lock.current = true; setBusy(true);
    try {
      const result = await api.requestPasswordReset(email.trim());
      setChallenge(result); setCode(""); setMessage(result.message);
      setResendAt(Date.now() + result.resendAfterSeconds * 1000);
    } catch (error) { setFailure(error.message); setErrors(error.fieldErrors || {}); }
    finally { lock.current = false; setBusy(false); }
  };
  const reset = async () => {
    if (lock.current) return;
    const fields = { code: /^\d{6}$/.test(code) ? null : "Enter the six-digit code from your email.", newPassword: validatePassword(newPassword), confirm: validateConfirmPassword(newPassword, confirm) };
    setErrors(fields); setFailure("");
    if (Object.values(fields).some(Boolean)) { focusError(fields); return; }
    lock.current = true; setBusy(true);
    try {
      const result = await api.resetPassword(challenge.challengeId, code, newPassword);
      setDone(true); setMessage(result.message); setCode(""); setPassword(""); setConfirm(""); setChallenge(null);
    } catch (error) { setFailure(error.message); const fields = error.fieldErrors || { code: error.message }; setErrors(fields); focusError(fields); }
    finally { lock.current = false; setBusy(false); }
  };
  const input = key => ({ inputRef: node => { inputs.current[key] = node; }, editable: !busy, error: errors[key] });
  return <LoginLayout title={done ? "Password updated" : "Forgot password?"} subtitle={done ? "You can now return to your travels." : "Reset your password using a code sent to your account email."} onBack={back} backLabel="Back to sign in">
    {!!message && <Text accessibilityLiveRegion="polite" style={themeStyle(styles.message)}>{message}</Text>}
    {!done && <>
      <AuthInput label="Account email" placeholder="juan.delacruz@gmail.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" maxLength={254} {...input("email")} editable={!busy && !challenge} />
      {!challenge && <Text style={themeStyle(styles.message)}>Use the email linked to your account. LGU accounts can also reset their password here.</Text>}
      {challenge && <>
        <AuthInput label="Verification code" placeholder="123456" hint="The latest code expires after 10 minutes and can be used once." value={code} onChangeText={value => setCode(value.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoComplete="one-time-code" textContentType="oneTimeCode" maxLength={6} {...input("code")} />
        <AuthInput label="New password" placeholder="Create your new password" hint="8–72 characters, including an uppercase letter and a number. Only letters, numbers, _, - and @." value={newPassword} onChangeText={setPassword} isPassword autoComplete="new-password" maxLength={72} {...input("newPassword")} />
        <AuthInput label="Confirm new password" placeholder="Re-enter your new password" value={confirm} onChangeText={setConfirm} isPassword autoComplete="new-password" maxLength={72} {...input("confirm")} returnKeyType="go" onSubmitEditing={reset} />
      </>}
      {!!failure && <Text accessibilityRole="alert" style={themeStyle(styles.error)}>{failure}</Text>}
      <TravelButton label={challenge ? "Reset password" : "Send verification code"} loading={busy} onPress={challenge ? reset : sendCode} />
      {challenge && <>
        <Pressable accessibilityRole="button" disabled={busy || seconds > 0} onPress={sendCode} style={styles.link}><Text style={themeStyle(styles.linkText)}>{seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setChallenge(null); setCode(""); setMessage(""); setErrors({}); setFailure(""); setResendAt(0); }} style={styles.link}><Text style={themeStyle(styles.linkText)}>Use a different email</Text></Pressable>
      </>}
    </>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={back} style={styles.link}><Text style={themeStyle(styles.linkText)}>Back to sign in</Text></Pressable>
  </LoginLayout>;
}
const styles = StyleSheet.create({
  message: { color: "#A9C4D4", fontSize: 14, lineHeight: 21, marginBottom: 18 },
  error: { color: "#FF9B85", fontSize: 13, lineHeight: 20, marginBottom: 14 },
  link: { minHeight: 44, padding: 10, justifyContent: "center", alignItems: "center" },
  linkText: { color: "#F5BC92", fontWeight: "600", fontSize: 14 },
});
