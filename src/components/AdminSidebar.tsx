import { Compass, Home, MapPin, Wallet, Bookmark, Download, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { colors } from "../theme/colors";
import { useAuthStore } from "../store/authStore";
import BudgetOverview from "./BudgetOverview";
import SavedTripCard from "./SavedTripCard";
import { savedTrips } from "../data/places";

const navItems = [
  { label: "Dashboard", icon: Home, active: true },
  { label: "My Trips", icon: MapPin, active: false },
  { label: "Budget", icon: Wallet, active: false },
  { label: "Saved Places", icon: Bookmark, active: false },
  { label: "Offline Maps", icon: Download, active: false },
  { label: "Settings", icon: Settings, active: false },
];

export default function UserSidebar() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      style={{
        width: 340,
        minWidth: 340,
        backgroundColor: colors.oceanBlue,
        color: colors.white,
        height: "100vh",
        overflowY: "auto",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            backgroundColor: colors.sunsetCoral,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Compass size={22} color={colors.white} />
        </div>
        <div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 17 }}>
            Multraverse
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8FB0C2" }}>
            Pangasinan Edition
          </div>
        </div>
      </div>

      {/* Profile card */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          backgroundColor: "rgba(255,255,255,0.05)",
          borderRadius: 14,
          padding: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: colors.sunsetCoral,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: colors.white,
            flexShrink: 0,
          }}
        >
          JC
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 14 }}>
            Juan dela Cruz
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8FB0C2" }}>
            Explorer · Dagupan City
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Log out"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
            borderRadius: 8,
            color: "#8FB0C2",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = colors.sunsetCoral;
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#8FB0C2";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {navItems.map(({ label, icon: Icon, active }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 12px",
              borderRadius: 10,
              backgroundColor: active ? colors.oceanBlueDark : "transparent",
              color: active ? colors.sunsetCoral : colors.white,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
            }}
          >
            <Icon size={18} />
            {label}
          </div>
        ))}
      </nav>

      {/* Budget overview */}
      <div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            color: "#8FB0C2",
            marginBottom: 10,
          }}
        >
          BUDGET OVERVIEW
        </div>
        <BudgetOverview />
      </div>

      {/* Saved trips */}
      <div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            color: "#8FB0C2",
            marginBottom: 10,
          }}
        >
          SAVED TRIPS
        </div>
        {savedTrips.map((t) => (
          <SavedTripCard key={t.title} {...t} />
        ))}
      </div>

      {/* Logout */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "none",
            backgroundColor: "transparent",
            color: "#FF9B85",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            textAlign: "left",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <LogOut size={18} />
          Log out
        </button>
      </div>
    </aside>
  );
}