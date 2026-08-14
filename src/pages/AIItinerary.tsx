import { useState } from "react";
import { Zap, Clock, Wallet, Bus } from "lucide-react";
import { colors } from "../theme/colors";

const destinations = [
  "Hundred Islands",
  "Patar Beach",
  "Manaoag Shrine",
  "Lingayen",
  "Bolinao",
  "Urdaneta",
];

const preferences = [
  "Budget-friendly",
  "Island hopping",
  "Cultural sites",
  "Food stops",
  "Photography spots",
  "Accessible routes",
];

const features = [
  {
    icon: Clock,
    iconBg: colors.oceanBlueLight,
    iconColor: colors.oceanBlue,
    title: "Smart Timing",
    desc: "AI picks optimal departure times to avoid traffic and peak hours",
  },
  {
    icon: Wallet,
    iconBg: colors.palmGreenLight,
    iconColor: colors.palmGreen,
    title: "Budget-Aware",
    desc: "Each stop is balanced to keep your total spend within budget",
  },
  {
    icon: Bus,
    iconBg: colors.coralLight,
    iconColor: colors.sunsetCoral,
    title: "Transit-Smart",
    desc: "Routes use real Pangasinan jeepney and bus schedules",
  },
];

export default function AIItinerary() {
  const [selectedDestination, setSelectedDestination] = useState("Hundred Islands");
  const [budget, setBudget] = useState("2000");
  const [days, setDays] = useState("1");
  const [selectedPrefs, setSelectedPrefs] = useState<string[]>([]);

  const togglePref = (pref: string) => {
    setSelectedPrefs((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#F7F9FB",
        overflowY: "auto",
        padding: "32px 40px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "#1A2E40",
            margin: 0,
            marginBottom: 4,
          }}
        >
          AI Itinerary Planner
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6B8CA8" }}>
          Smart trip planning powered by Claude AI
        </p>
      </div>

      {/* Main card */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          marginBottom: 24,
        }}
      >
        {/* Dashed top border decoration */}
        <div
          style={{
            borderTop: "2px dashed #D6E4EF",
            marginBottom: 24,
          }}
        />

        <h2
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            color: "#1A2E40",
            margin: "0 0 24px 0",
          }}
        >
          Where do you want to go?
        </h2>

        {/* Destination */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "#6B8CA8",
              marginBottom: 10,
            }}
          >
            Destination
          </label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            {destinations.map((dest) => {
              const isActive = selectedDestination === dest;
              return (
                <button
                  key={dest}
                  onClick={() => setSelectedDestination(dest)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: isActive ? "none" : "1.5px solid #E2EBF3",
                    backgroundColor: isActive ? colors.oceanBlue : "#fff",
                    color: isActive ? "#fff" : "#1A2E40",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: isActive ? 600 : 400,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  {dest}
                </button>
              );
            })}
          </div>
        </div>

        {/* Budget + Days row */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B8CA8",
                marginBottom: 8,
              }}
            >
              Trip Budget (₱)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1.5px solid #E2EBF3",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A2E40",
                backgroundColor: "#fff",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B8CA8",
                marginBottom: 8,
              }}
            >
              Number of Days
            </label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: "1.5px solid #E2EBF3",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                color: "#1A2E40",
                backgroundColor: "#fff",
                boxSizing: "border-box",
                outline: "none",
                appearance: "auto",
                cursor: "pointer",
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={String(d)}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Travel preferences */}
        <div style={{ marginBottom: 32 }}>
          <label
            style={{
              display: "block",
              fontSize: 13,
              fontWeight: 500,
              color: "#6B8CA8",
              marginBottom: 10,
            }}
          >
            Travel Preferences
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {preferences.map((pref) => {
              const isSelected = selectedPrefs.includes(pref);
              return (
                <button
                  key={pref}
                  onClick={() => togglePref(pref)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 20,
                    border: isSelected ? "1.5px solid #1A3A5C" : "1.5px solid #D6E4EF",
                    backgroundColor: isSelected ? "#EAF1F8" : "#fff",
                    color: isSelected ? "#1A3A5C" : "#4A6880",
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: isSelected ? 600 : 400,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {pref}
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate button */}
        <button
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: "none",
            background: `linear-gradient(90deg, ${colors.oceanBlue} 0%, ${colors.sunsetCoral} 100%)`,
            color: "#fff",
            fontSize: 15,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Zap size={18} />
          Generate AI Itinerary
        </button>
      </div>

      {/* Feature cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {features.map(({ icon: Icon, iconBg, iconColor, title, desc }) => (
          <div
            key={title}
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: "20px 20px 22px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                backgroundColor: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Icon size={18} color={iconColor} />
            </div>
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 600,
                fontSize: 14,
                color: "#1A2E40",
                marginBottom: 6,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 13, color: "#6B8CA8", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}