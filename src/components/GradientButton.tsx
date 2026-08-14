import type { ButtonHTMLAttributes } from "react";
import { colors } from "../theme/colors";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  loading?: boolean;
}

export default function GradientButton({ label, loading, disabled, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        width: "100%",
        height: 54,
        borderRadius: 16,
        border: "none",
        cursor: disabled || loading ? "default" : "pointer",
        background:
          disabled || loading
            ? "linear-gradient(90deg, #B8B8B8, #9E9E9E)"
            : `linear-gradient(90deg, ${colors.sunsetCoral}, #F2A63E)`,
        fontFamily: "'Poppins', sans-serif",
        fontWeight: 600,
        fontSize: 16,
        color: colors.white,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      {...rest}
    >
      {loading ? <Spinner /> : label}
    </button>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 18,
        height: 18,
        border: "2.5px solid rgba(255,255,255,0.4)",
        borderTopColor: colors.white,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}