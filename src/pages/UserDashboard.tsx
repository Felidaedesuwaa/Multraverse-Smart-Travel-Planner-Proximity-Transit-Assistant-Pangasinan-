import { Filter, Navigation } from "lucide-react";
import { colors } from "../theme/colors";
import PangasinanMap from "../components/PangasinanMap";

export default function UserDashboard() {
  return (
    <div
      style={{
        flex: 1,
        padding: 28,
        backgroundColor: colors.warmSand,
        minHeight: "100vh",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: colors.oceanBlue,
              margin: 0,
            }}
          >
            Pangasinan Interactive Map
          </h1>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: colors.palmGreen,
              backgroundColor: colors.palmGreenLight,
              padding: "4px 12px",
              borderRadius: 999,
            }}
          >
            Offline-ready
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 10,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.white,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: colors.textPrimary,
              cursor: "pointer",
            }}
          >
            <Filter size={15} /> Filter
          </button>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "9px 16px",
              borderRadius: 10,
              border: "none",
              backgroundColor: colors.oceanBlue,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              color: colors.white,
              cursor: "pointer",
            }}
          >
            <Navigation size={15} /> Navigate
          </button>
        </div>
      </div>

      {/* Map */}
      <PangasinanMap />
    </div>
  );
}