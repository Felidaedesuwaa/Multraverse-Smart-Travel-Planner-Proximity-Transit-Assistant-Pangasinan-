import {
  Compass,
  Home,
  MapPin,
  Wallet,
  Bookmark,
  Download,
  Settings,
  LogOut,
  Sparkles,
  Bell,
  Languages,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { colors } from "../theme/colors";
import { useAuthStore } from "../store/authStore";
import BudgetOverview from "./BudgetOverview";
import SavedTripCard from "./SavedTripCard";
import { savedTrips } from "../data/places";

const navItems = [
  { label: "Dashboard", icon: Home, path: "/" },
  { label: "My Trips", icon: MapPin, path: "/my-trips", badge: 2 },
  { label: "Budget", icon: Wallet, path: "/budget" },
  { label: "Saved Places", icon: Bookmark, path: "/saved-places", badge: 6 },
  { label: "Offline Maps", icon: Download, path: "/offline-maps" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const aiToolItems = [
  { label: "AI Itinerary", icon: Sparkles, path: "/ai-itinerary" },
  { label: "Transit Alarm", icon: Bell, path: "/transit-alarm" },
  { label: "Translator", icon: Languages, path: "/translator" },
];

const AiBadge = () => (
  <span
    style={{
      marginLeft: "auto",
      fontSize: 10,
      fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif",
      color: colors.sunsetCoral,
      backgroundColor: "rgba(255,107,74,0.15)",
      borderRadius: 6,
      padding: "2px 6px",
      letterSpacing: 0.3,
      flexShrink: 0,
    }}
  >
    AI
  </span>
);

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      style={{
        width: 280,
        minWidth: 280,
        backgroundColor: colors.oceanBlue,
        color: colors.white,
        height: "100vh",
        overflowY: "auto",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        boxSizing: "border-box",
      }}
    >
      {/* Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.sunsetCoral,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
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
          padding: "12px 14px",
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
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
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

      {/* Main Nav */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(({ label, icon: Icon, path, badge }) => {
          const active = location.pathname === path;
          return (
            <div
              key={label}
              onClick={() => navigate(path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                borderRadius: 10,
                backgroundColor: active ? colors.oceanBlueDark : "transparent",
                color: active ? colors.sunsetCoral : colors.white,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge !== undefined && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif",
                    color: colors.white,
                    backgroundColor: colors.sunsetCoral,
                    borderRadius: 20,
                    padding: "1px 7px",
                    flexShrink: 0,
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* AI Tools section */}
      <div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            color: "#8FB0C2",
            marginBottom: 8,
            paddingLeft: 14,
          }}
        >
          AI TOOLS
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {aiToolItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path;
            return (
              <div
                key={label}
                onClick={() => navigate(path)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  backgroundColor: active ? colors.oceanBlueDark : "transparent",
                  color: active ? colors.sunsetCoral : colors.white,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <Icon size={18} />
                <span style={{ flex: 1 }}>{label}</span>
                <AiBadge />
              </div>
            );
          })}
        </nav>
      </div>

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
      <div
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          paddingTop: 16,
          marginTop: "auto",
        }}
      >
        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "10px 14px",
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