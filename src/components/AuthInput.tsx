import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { colors } from "../theme/colors";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  isPassword?: boolean;
}

export default function AuthInput({ label, error, isPassword, ...rest }: Props) {
  const [hidden, setHidden] = useState(isPassword);

  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: colors.white,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(255,255,255,0.08)",
          borderRadius: 12,
          border: `1px solid ${error ? colors.sunsetCoral : "rgba(255,255,255,0.15)"}`,
          padding: "0 14px",
          height: 50,
        }}
      >
        <input
          type={isPassword ? (hidden ? "password" : "text") : rest.type ?? "text"}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15,
            color: colors.white,
          }}
          autoComplete={isPassword ? "current-password" : "off"}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setHidden(!hidden)}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}
          >
            {hidden ? <EyeOff size={18} color="#8FB0C2" /> : <Eye size={18} color="#8FB0C2" />}
          </button>
        )}
      </div>
      {error ? (
        <span style={{ display: "block", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#FF9B85", marginTop: 4 }}>
          {error}
        </span>
      ) : null}
    </div>
  );
}