import { useAppTheme } from "../theme/useAppTheme";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AuthInput from "../components/AuthInput";
import LoginLayout from "../components/LoginLayout";
import { TravelButton } from "../components/SummerUI";
import { useAuthStore } from "../store/authStore";
import { validateEmail } from "../utils/validation";

export default function LoginPage() {
  const { themeStyle } = useAppTheme();

  const navigation = useNavigation();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
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
      if (success) {
        const role = useAuthStore.getState().user?.role;
        navigation.reset({ index: 0, routes: [{ name: role === "ADMIN" ? "Admin" : "User" }] });
      } else setFormError(useAuthStore.getState().error);
    } finally { submitting.current = false; }
  };

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
    </LoginLayout>
  );
}

const styles = StyleSheet.create({
  footerText: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center" },
  footerLink: { fontFamily: "Poppins", fontWeight: "600", color: "#F5BC92", fontSize: 14 },
  signup: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  formError: { fontFamily: "DMSans", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 },
});
