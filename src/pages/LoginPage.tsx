import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { colors } from "../theme/colors";
import AuthLayout from "../components/AuthLayout";
import AuthInput from "../components/AuthInput";
import GradientButton from "../components/GradientButton";
import { useAuthStore } from "../store/authStore.ts";
import { validateEmail } from "../utils/validation";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passwordErr = !password ? "Password is required" : null;

    setErrors({ email: emailErr, password: passwordErr });
    setFormError(null);
    if (emailErr || passwordErr) return;

    const success = await login(email, password);
    if (success) {
      const role = useAuthStore.getState().user?.role;
      navigate(role === "admin" ? "/admin" : "/");
    } else {
      setFormError(useAuthStore.getState().error);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue planning your Pangasinan trip."
      showBack={false}
      footer={
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#A9C4D4" }}>
          Don't have an account?{" "}
          <Link to="/register" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, color: colors.sunsetCoral, textDecoration: "none" }}>
            Sign up
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthInput label="Email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <AuthInput label="Password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} isPassword />

        {formError ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#FF9B85", textAlign: "center", marginBottom: 12 }}>
            {formError}
          </p>
        ) : null}

        <GradientButton type="submit" label="Sign In" loading={isLoading} />
      </form>

      {/* Sample accounts for testing — remove before shipping */}
      <div style={{ marginTop: 28, padding: 14, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.06)" }}>
        <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 12, color: colors.white, margin: "0 0 6px" }}>
          Sample accounts (dev only)
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#A9C4D4", margin: 0, lineHeight: 1.6 }}>
          Traveler: traveler@multraverse.ph / Traveler123<br />
          Admin: admin@multraverse.ph / Admin123!
        </p>
      </div>
    </AuthLayout>
  );
}
