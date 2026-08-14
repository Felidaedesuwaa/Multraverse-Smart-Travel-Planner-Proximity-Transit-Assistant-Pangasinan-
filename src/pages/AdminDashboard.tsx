import type { CSSProperties, ReactNode } from "react";
import { Users, Route, Radio, Wallet, RefreshCw, Download, Plus, Eye, Settings2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
  AreaChart, Area,
} from "recharts";
import { colors } from "../theme/colors";
import AdminSidebar from "../components/AdminSidebar";
import AdminStatCard from "../components/AdminStatCard";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";

const routeData = [
  { name: "Alaminos", value: 1180, color: colors.oceanBlue },
  { name: "Lingayen", value: 940, color: colors.sunsetCoral },
  { name: "Bolinao", value: 760, color: colors.palmGreen },
  { name: "Manaoag", value: 610, color: colors.gold },
  { name: "Urdaneta", value: 430, color: "#A9CBE0" },
  { name: "Sual", value: 300, color: colors.slate },
];

const budgetRangeData = [
  { name: "₱500–1k", value: 28, color: colors.oceanBlue },
  { name: "₱1k–2k", value: 42, color: colors.sunsetCoral },
  { name: "₱2k–5k", value: 22, color: colors.palmGreen },
  { name: "₱5k+", value: 8, color: colors.gold },
];

const weeklyActivity = [
  { day: "Mon", alerts: 480, users: 120 },
  { day: "Tue", alerts: 560, users: 140 },
  { day: "Wed", alerts: 610, users: 150 },
  { day: "Thu", alerts: 540, users: 145 },
  { day: "Fri", alerts: 820, users: 190 },
  { day: "Sat", alerts: 1080, users: 240 },
  { day: "Sun", alerts: 990, users: 220 },
];

const geofences = [
  { location: "Alaminos Terminal", zone: "Hundred Islands", status: "active" as const, alerts: 124, radius: "200 m" },
  { location: "Dagupan Central", zone: "City Core", status: "active" as const, alerts: 89, radius: "150 m" },
  { location: "Manaoag Shrine", zone: "Pilgrimage", status: "inactive" as const, alerts: 0, radius: "100 m" },
  { location: "Patar Beach", zone: "Bolinao Coast", status: "active" as const, alerts: 67, radius: "300 m" },
  { location: "Lingayen Capitol", zone: "Provincial Gov.", status: "active" as const, alerts: 45, radius: "250 m" },
];

function HeaderButton({ icon, label, filled }: { icon: ReactNode; label: string; filled?: boolean }) {
  return (
    <button
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "9px 16px",
        borderRadius: 10,
        border: filled ? "none" : `1px solid ${colors.border}`,
        backgroundColor: filled ? colors.sunsetCoral : colors.white,
        color: filled ? colors.white : colors.textPrimary,
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}

export default function AdminDashboard() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: colors.warmSand }}>
      <AdminSidebar />
      <main style={{ flex: 1, padding: 28 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 26, fontWeight: 700, color: colors.oceanBlue, margin: 0 }}>
              Admin Overview
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
              Pangasinan Province · Real-time · Aug 2026
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <HeaderButton icon={<RefreshCw size={14} />} label="Refresh" />
            <HeaderButton icon={<Download size={14} />} label="Export" filled />
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <AdminStatCard
            label="Active Users"
            value="4,821"
            delta="+18% this week"
            icon={<Users size={18} color={colors.oceanBlue} />}
            iconBg={colors.oceanBlueLight}
            dividerColor={colors.oceanBlue}
          />
          <AdminStatCard
            label="Popular Routes"
            value="47"
            delta="+3 new this week"
            icon={<Route size={18} color={colors.sunsetCoral} />}
            iconBg={colors.coralLight}
            dividerColor={colors.sunsetCoral}
          />
          <AdminStatCard
            label="Active Geofences"
            value="23"
            delta="Live this week"
            icon={<Radio size={18} color={colors.palmGreen} />}
            iconBg={colors.palmGreenLight}
            dividerColor={colors.palmGreen}
          />
          <AdminStatCard
            label="Avg Trip Budget"
            value="₱1,840"
            delta="-₱120 this week"
            icon={<Wallet size={18} color={colors.gold} />}
            iconBg={colors.goldLight}
            dividerColor={colors.gold}
          />
        </div>

        {/* Popular routes + budget range */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <Card style={{ flex: 1.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, color: colors.oceanBlue, margin: 0 }}>
                Popular Routes
              </h2>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: colors.oceanBlue,
                  backgroundColor: colors.oceanBlueLight,
                  padding: "4px 12px",
                  borderRadius: 999,
                }}
              >
                This week
              </span>
            </div>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={routeData}>
                  <CartesianGrid stroke={colors.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontFamily: "DM Sans", fontSize: 12, fill: colors.textMuted }} axisLine={{ stroke: colors.border }} tickLine={false} />
                  <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontFamily: "DM Sans", fontSize: 12, borderRadius: 8, border: `1px solid ${colors.border}` }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
                    {routeData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, color: colors.oceanBlue, margin: "0 0 16px" }}>
              Budget Range
            </h2>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={budgetRangeData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {budgetRangeData.map((d, i) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
              {budgetRangeData.map((d) => (
                <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color, display: "inline-block" }} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textPrimary }}>{d.name}</span>
                  </div>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: colors.textPrimary }}>
                    {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Weekly activity */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, color: colors.oceanBlue, margin: 0 }}>
              Weekly Activity
            </h2>
            <div style={{ display: "flex", gap: 16, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors.oceanBlue, display: "inline-block" }} /> Users
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors.sunsetCoral, display: "inline-block" }} /> Alerts
              </span>
            </div>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={weeklyActivity}>
                <defs>
                  <linearGradient id="alertsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.sunsetCoral} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={colors.sunsetCoral} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.border} vertical={false} />
                <XAxis dataKey="day" tick={{ fontFamily: "DM Sans", fontSize: 12, fill: colors.textMuted }} axisLine={{ stroke: colors.border }} tickLine={false} />
                <YAxis tick={{ fontFamily: "DM Sans", fontSize: 12, fill: colors.textMuted }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontFamily: "DM Sans", fontSize: 12, borderRadius: 8, border: `1px solid ${colors.border}` }} />
                <Area type="monotone" dataKey="alerts" stroke={colors.sunsetCoral} strokeWidth={2} fill="url(#alertsFill)" />
                <Area type="monotone" dataKey="users" stroke={colors.oceanBlue} strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Active geofences table */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 17, fontWeight: 700, color: colors.oceanBlue, margin: 0 }}>
              Active Geofences
            </h2>
            <HeaderButton icon={<Plus size={14} />} label="Add Zone" filled />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Location", "Zone", "Status", "Alerts (7d)", "Radius", "Actions"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      letterSpacing: 0.5,
                      color: colors.textMuted,
                      fontWeight: 600,
                      padding: "8px 10px",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {geofences.map((g) => (
                <tr key={g.location}>
                  <td style={cellStyle}>
                    <span style={{ fontWeight: 600, color: colors.oceanBlue }}>{g.location}</span>
                  </td>
                  <td style={cellStyle}>{g.zone}</td>
                  <td style={cellStyle}>
                    <StatusBadge status={g.status} />
                  </td>
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{g.alerts}</td>
                  <td style={cellStyle}>{g.radius}</td>
                  <td style={cellStyle}>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Eye size={16} color={colors.textMuted} style={{ cursor: "pointer" }} />
                      <Settings2 size={16} color={colors.sunsetCoral} style={{ cursor: "pointer" }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </div>
  );
}

const cellStyle: CSSProperties = {
  padding: "12px 10px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: colors.textPrimary,
  borderBottom: `1px solid ${colors.border}`,
};
