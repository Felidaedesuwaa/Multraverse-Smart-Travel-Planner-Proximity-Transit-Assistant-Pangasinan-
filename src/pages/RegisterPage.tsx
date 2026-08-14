import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { colors } from "../theme/colors";
import AuthLayout from "../components/AuthLayout";
import AuthInput from "../components/AuthInput";
import GradientButton from "../components/GradientButton";
import { useAuthStore } from "../store/authStore.ts";
import { validateEmail, validatePassword, validateName, validateConfirmPassword } from "../utils/validation";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nameErr = validateName(name);
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const confirmErr = validateConfirmPassword(password, confirm);

    setErrors({ name: nameErr, email: emailErr, password: passwordErr, confirm: confirmErr });
    setFormError(null);
    if (nameErr || emailErr || passwordErr || confirmErr) return;

    const success = await register(name, email, password);
    if (success) {
      navigate("/");
    } else {
      setFormError(useAuthStore.getState().error);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start planning your Pangasinan adventure."
      footer={
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#A9C4D4" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: colors.sunsetCoral, textDecoration: "none" }}>
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthInput label="Full name" placeholder="Juan dela Cruz" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <AuthInput label="Email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <AuthInput label="Password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} isPassword />
        <AuthInput label="Confirm password" placeholder="Re-enter your password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} isPassword />

        {formError ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 }}>
            {formError}
          </p>
        ) : null}

        <GradientButton type="submit" label="Create Account" loading={isLoading} />
      </form>
    </AuthLayout>
  );
}
