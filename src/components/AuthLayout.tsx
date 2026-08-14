import type { ReactNode } from "react";
import { Compass, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { colors } from "../theme/colors";

export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  showBack?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.oceanBlue,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Wave decoration */}
      <svg
        viewBox="0 0 500 150"
        preserveAspectRatio="none"
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 140, opacity: 0.5 }}
      >
        <path d="M0,80 C120,120 380,20 500,80 L500,150 L0,150 Z" fill="rgba(255,255,255,0.06)" />
      </svg>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              color: colors.white,
              marginBottom: 16,
              padding: 0,
            }}
          >
            <ChevronLeft size={22} />
          </button>
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${colors.sunsetCoral}, #F2A63E)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Compass size={34} color={colors.white} />
          </div>
          <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 26, color: colors.white, margin: 0 }}>
            {title}
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#A9C4D4",
              textAlign: "center",
              marginTop: 8,
              maxWidth: 320,
            }}
          >
            {subtitle}
          </p>
        </div>

        {children}

        <div style={{ marginTop: 24, textAlign: "center" }}>{footer}</div>
      </div>
    </div>
  );
}