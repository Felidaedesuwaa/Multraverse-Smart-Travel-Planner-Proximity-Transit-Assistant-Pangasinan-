import { useState } from "react";
import type { ReactNode } from "react";
import { colors } from "../theme/colors";
import Card from "../components/Card";
import WovenDivider from "../components/WovenDivider";
import ToggleSwitch from "../components/Toggleswitch";
import { useAuthStore } from "../store/authStore";

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={{ padding: 0, marginBottom: 20 }}>
      <div
        style={{
          padding: "16px 22px",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.6,
          color: colors.textMuted,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {title.toUpperCase()}
      </div>
      <div>{children}</div>
    </Card>
  );
}

function SettingsRow({
  label,
  description,
  control,
  last = false,
  labelColor,
}: {
  label: string;
  description: string;
  control: ReactNode;
  last?: boolean;
  labelColor?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "18px 22px",
        borderBottom: last ? "none" : `1px solid ${colors.border}`,
        gap: 20,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: labelColor ?? colors.textPrimary,
          }}
        >
          {label}
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
          {description}
        </div>
      </div>
      {control}
    </div>
  );
}

const selectStyle = {
  padding: "9px 14px",
  borderRadius: 10,
  border: `1.5px solid ${colors.border}`,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: colors.textPrimary,
  backgroundColor: "#fff",
  cursor: "pointer",
  outline: "none",
};

const inputStyle = {
  padding: "9px 14px",
  borderRadius: 10,
  border: `1.5px solid ${colors.border}`,
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: colors.textPrimary,
  backgroundColor: "#fff",
  outline: "none",
  width: 220,
};

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [emailDigest, setEmailDigest] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("English");
  const [currency, setCurrency] = useState("PHP ₱");
  const [defaultRegion, setDefaultRegion] = useState("Pangasinan, Philippines");

  const name = user?.name ?? "Juan dela Cruz";
  const email = user?.email ?? "juan@example.com";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main style={{ minHeight: "100%", padding: 28, maxWidth: 840, backgroundColor: colors.warmSand }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              color: colors.oceanBlue,
              margin: 0,
            }}
          >
            Settings
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
            Manage your account and preferences
          </p>
        </div>

        {/* Profile card */}
        <Card style={{ marginBottom: 28 }}>
          <WovenDivider color={colors.sunsetCoral} count={40} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  backgroundColor: colors.sunsetCoral,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 20,
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, color: colors.textPrimary }}>
                  {name}
                </div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, marginBottom: 12 }}>
                  {email} · Explorer · Dagupan City
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    style={{
                      padding: "9px 18px",
                      borderRadius: 10,
                      border: "none",
                      backgroundColor: colors.oceanBlue,
                      color: "#fff",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Edit Profile
                  </button>
                  <button
                    style={{
                      padding: "9px 18px",
                      borderRadius: 10,
                      border: `1.5px solid ${colors.border}`,
                      backgroundColor: "#fff",
                      color: colors.textPrimary,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Change Photo
                  </button>
                </div>
              </div>
            </div>
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 14px",
                borderRadius: 999,
                color: colors.sunsetCoral,
                backgroundColor: colors.coralLight,
                whiteSpace: "nowrap",
              }}
            >
              Explorer
            </span>
          </div>
        </Card>

        {/* Notifications */}
        <SectionCard title="Notifications">
          <SettingsRow
            label="Push Notifications"
            description="Receive alerts on your device"
            control={<ToggleSwitch checked={pushNotifications} onChange={setPushNotifications} />}
          />
          <SettingsRow
            label="SMS Alerts"
            description="Transit alarm via text message"
            control={<ToggleSwitch checked={smsAlerts} onChange={setSmsAlerts} />}
          />
          <SettingsRow
            label="Email Digest"
            description="Weekly travel summary"
            control={<ToggleSwitch checked={emailDigest} onChange={setEmailDigest} />}
            last
          />
        </SectionCard>

        {/* App preferences */}
        <SectionCard title="App Preferences">
          <SettingsRow
            label="Dark Mode"
            description="Switch to dark theme"
            control={<ToggleSwitch checked={darkMode} onChange={setDarkMode} />}
          />
          <SettingsRow
            label="Language"
            description="App display language"
            control={
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={selectStyle}>
                <option>English</option>
                <option>Filipino</option>
                <option>Pangasinan</option>
              </select>
            }
          />
          <SettingsRow
            label="Currency"
            description="Budget display currency"
            control={
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={selectStyle}>
                <option>PHP ₱</option>
                <option>USD $</option>
              </select>
            }
          />
          <SettingsRow
            label="Default Destination Region"
            description="Pre-filled in trip search"
            control={
              <input
                value={defaultRegion}
                onChange={(e) => setDefaultRegion(e.target.value)}
                style={inputStyle}
              />
            }
            last
          />
        </SectionCard>

        {/* Privacy & data */}
        <SectionCard title="Privacy & Data">
          <SettingsRow
            label="Location Access"
            description="Required for transit alarm & geofencing"
            control={
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 12px",
                  borderRadius: 999,
                  color: colors.palmGreen,
                  backgroundColor: colors.palmGreenLight,
                }}
              >
                Allowed
              </span>
            }
          />
          <SettingsRow
            label="Delete Account"
            description="Permanently remove your data"
            labelColor={colors.sunsetCoral}
            control={
              <button
                style={{
                  padding: "9px 18px",
                  borderRadius: 10,
                  border: `1.5px solid ${colors.coralLight}`,
                  backgroundColor: "#fff",
                  color: colors.sunsetCoral,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            }
            last
          />
        </SectionCard>
    </main>
  );
}
