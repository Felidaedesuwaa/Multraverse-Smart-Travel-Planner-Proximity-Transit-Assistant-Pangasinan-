import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import AuthInput from "../components/AuthInput";
import AuthLayout from "../components/AuthLayout";
import GradientButton from "../components/GradientButton";
import { useAuthStore } from "../store/authStore";
import { validateEmail } from "../utils/validation";

export default function LoginPage() {
  const navigation = useNavigation();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  const handleSubmit = async () => {
    const emailError = validateEmail(email);
    const passwordError = password ? null : "Password is required";
    setErrors({ email: emailError, password: passwordError });
    setFormError(null);
    if (emailError || passwordError) return;

    const success = await login(email, password);
    if (success) {
      const role = useAuthStore.getState().user?.role;
      navigation.reset({ index: 0, routes: [{ name: role === "ADMIN" ? "Admin" : "User" }] });
    } else {
      setFormError(useAuthStore.getState().error);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue planning your Pangasinan trip."
      showBack={false}
      footer={<Text style={styles.footerText}>Don't have an account? <Text style={styles.footerLink} onPress={() => navigation.navigate("Register")}>Sign up</Text></Text>}
    >
      <AuthInput label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" />
      <AuthInput label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} error={errors.password} isPassword />
      {formError ? <Text style={styles.formError}>{formError}</Text> : null}
      <GradientButton label="Sign In" loading={isLoading} onPress={handleSubmit} />
      <View style={styles.sampleAccounts}>
        <Text style={styles.sampleTitle}>Sample accounts (dev only)</Text>
        <Text style={styles.sampleText}>Traveler: traveler@multraverse.ph / Traveler123{"\n"}Admin: admin@multraverse.ph / Admin123!</Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerText: { fontFamily: "DMSans", fontSize: 14, color: "#A9C4D4", textAlign: "center" },
  footerLink: { fontFamily: "Poppins", fontWeight: "600", color: colors.sunsetCoral },
  formError: { fontFamily: "DMSans", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 },
  sampleAccounts: { marginTop: 28, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" },
  sampleTitle: { fontFamily: "Poppins", fontWeight: "600", fontSize: 12, color: colors.white, marginBottom: 6 },
  sampleText: { fontFamily: "DMSans", fontSize: 12, color: "#A9C4D4", lineHeight: 19 },
});
