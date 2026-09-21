import { useAppTheme } from "../theme/useAppTheme";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import AuthInput from "../components/AuthInput";
import AuthLayout from "../components/AuthLayout";
import GradientButton from "../components/GradientButton";
import { useAuthStore } from "../store/authStore";
import { validateConfirmPassword, validateEmail, validateName, validatePassword } from "../utils/validation";

export default function RegisterPage() {
  const { themeStyle } = useAppTheme();

  const navigation = useNavigation();
  const { register, isLoading } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const handleSubmit = async () => {
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmError = validateConfirmPassword(password, confirm);
    setErrors({ name: nameError, email: emailError, password: passwordError, confirm: confirmError });
    setFormError(null);
    if (nameError || emailError || passwordError || confirmError) return;

    const success = await register(name, email, password);
    if (success) navigation.reset({ index: 0, routes: [{ name: "User" }] });
    else setFormError(useAuthStore.getState().error);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start planning your Pangasinan adventure."
      footer={<Text style={themeStyle(styles.footerText)}>Already have an account? <Text style={themeStyle(styles.footerLink)} onPress={() => navigation.navigate("Login")}>Sign in</Text></Text>}
    >
      <AuthInput label="Full name" placeholder="Juan dela Cruz" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" />
      <AuthInput label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" />
      <AuthInput label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} error={errors.password} isPassword />
      <AuthInput label="Confirm password" placeholder="Re-enter your password" value={confirm} onChangeText={setConfirm} error={errors.confirm} isPassword />
      {formError ? <Text style={themeStyle(styles.formError)}>{formError}</Text> : null}
      <GradientButton label="Create Account" loading={isLoading} onPress={handleSubmit} />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerText: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center" },
  footerLink: { fontFamily: "Poppins", fontWeight: "600", color: colors.sunsetCoral },
  formError: { fontFamily: "DMSans", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 },
});
