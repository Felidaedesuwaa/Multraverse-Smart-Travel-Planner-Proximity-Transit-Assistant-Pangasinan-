import { useState } from "react";
import { Search, Bell, MapPin, Vibrate, Volume2, Smartphone, Bus, Car } from "lucide-react";
import { colors } from "../theme/colors";

const routes = [
  {
    name: "Urdaneta Bus Line",
    type: "Bus",
    stops: 4,
    price: 95,
    departure: "7:00 AM",
    arrival: "9:15 AM",
    icon: Bus,
  },
  {
    name: "Alaminos Express",
    type: "Bus",
    stops: 2,
    price: 110,
    departure: "7:45 AM",
    arrival: "9:50 AM",
    icon: Bus,
  },
  {
    name: "Jeepney (via Anda)",
    type: "Jeepney",
    stops: 8,
    price: 65,
    departure: "8:30 AM",
    arrival: "11:00 AM",
    icon: Car,
  },
];

const stopProgress = [
  { name: "Urdaneta Junction", detail: "18 min · 12.4 km", status: "upcoming" },
  { name: "Manaoag Crossroads", detail: "11 min · 8.1 km", status: "upcoming" },
  { name: "Bayambang Town", detail: "6 min · 4.7 km", status: "upcoming" },
  { name: "Malasiqui Stop", detail: "2 min · 1.2 km", status: "alert", alertZone: true },
  { name: "Alaminos Terminal", detail: "Arrived · 0 km", status: "arrived" },
];

const fromOptions = ["Dagupan", "Lingayen", "Urdaneta", "Alaminos", "San Carlos"];
const toOptions = ["Alaminos", "Dagupan", "Lingayen", "Urdaneta", "San Carlos"];
const alertStops = [
  "Urdaneta Junction",
  "Manaoag Crossroads",
  "Bayambang Town",
  "Malasiqui Stop",
  "Alaminos Terminal",
];

export default function TransitAlarm() {
  const [from, setFrom] = useState("Dagupan");
  const [to, setTo] = useState("Alaminos");
  const [alertStop, setAlertStop] = useState("Urdaneta Junction");
  const [radius, setRadius] = useState(500);
  const [alarmOn, setAlarmOn] = useState(false);
  const [notifMode, setNotifMode] = useState<"vibrate" | "sound" | "push">("vibrate");

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#F7F9FB",
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Page header */}
      <div
        style={{
          padding: "32px 40px 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              color: "#1A2E40",
              margin: "0 0 4px 0",
            }}
          >
            Transit Alarm
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#6B8CA8" }}>
            Proximity-based stop alerts for Pangasinan routes
          </p>
        </div>
        <button
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            backgroundColor: colors.sunsetCoral,
            color: "#fff",
            fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Bell size={16} />
          Set Alarm
        </button>
      </div>

      {/* Body: two-column layout */}
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 20,
          padding: "0 40px 40px",
          alignItems: "flex-start",
        }}
      >
        {/* Left column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {/* Plan Your Route card */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 17,
                color: "#1A2E40",
                margin: "0 0 20px 0",
              }}
            >
              Plan Your Route
            </h2>

            <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6B8CA8", marginBottom: 6 }}>
                  From
                </label>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #E2EBF3",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1A2E40",
                    backgroundColor: "#fff",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {fromOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6B8CA8", marginBottom: 6 }}>
                  To
                </label>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #E2EBF3",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1A2E40",
                    backgroundColor: "#fff",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {toOptions.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <button
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 12,
                border: "none",
                backgroundColor: colors.oceanBlue,
                color: "#fff",
                fontSize: 14,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Search size={16} />
              Find Routes
            </button>
          </div>

          {/* Available Routes */}
          <div>
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 16,
                color: "#1A2E40",
                margin: "0 0 14px 0",
              }}
            >
              Available Routes
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {routes.map((route) => (
                <div
                  key={route.name}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    padding: "18px 20px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Route header */}
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: "#F0F5FA",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 14,
                        flexShrink: 0,
                      }}
                    >
                      <route.icon size={18} color={colors.oceanBlue} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: "#1A2E40",
                          marginBottom: 2,
                        }}
                      >
                        {route.name}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B8CA8" }}>
                        {route.stops} stops · {route.type}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: colors.sunsetCoral,
                          marginBottom: 2,
                        }}
                      >
                        ₱{route.price}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B8CA8" }}>
                        {route.departure} → {route.arrival}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: "none",
                        backgroundColor: colors.sunsetCoral,
                        color: "#fff",
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <Bell size={14} />
                      Set Stop Alert
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: 10,
                        border: "1.5px solid #E2EBF3",
                        backgroundColor: "#fff",
                        color: "#4A6880",
                        fontSize: 13,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      <MapPin size={14} />
                      Track Route
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Stop Alarm card */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            {/* Dashed top decoration */}
            <div style={{ borderTop: "2px dashed #D6E4EF", marginBottom: 18 }} />

            {/* Alarm header with toggle */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#1A2E40",
                }}
              >
                Stop Alarm
              </span>
              {/* Toggle pill */}
              <button
                onClick={() => setAlarmOn((v) => !v)}
                style={{
                  width: 46,
                  height: 24,
                  borderRadius: 12,
                  border: "none",
                  backgroundColor: alarmOn ? colors.sunsetCoral : "#CBD5E0",
                  cursor: "pointer",
                  position: "relative",
                  transition: "background 0.2s",
                  padding: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: alarmOn ? 25 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    backgroundColor: "#fff",
                    transition: "left 0.2s",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    transform: "translateY(-50%)",
                    right: alarmOn ? "auto" : 6,
                    left: alarmOn ? 6 : "auto",
                    fontSize: 9,
                    fontWeight: 700,
                    color: alarmOn ? "#fff" : "#8A9BAD",
                  }}
                >
                  {alarmOn ? "On" : "Off"}
                </span>
              </button>
            </div>

            {/* Alert me at */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, color: "#6B8CA8", marginBottom: 6 }}>
                Alert me at
              </label>
              <select
                value={alertStop}
                onChange={(e) => setAlertStop(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px solid #E2EBF3",
                  fontSize: 13,
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1A2E40",
                  backgroundColor: "#fff",
                  outline: "none",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              >
                {alertStops.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            {/* Alert radius */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label style={{ fontSize: 12, color: "#6B8CA8" }}>Alert radius</label>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1A2E40" }}>
                  {radius} <span style={{ color: "#6B8CA8" }}>m</span>
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={2000}
                step={100}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: colors.sunsetCoral,
                  cursor: "pointer",
                }}
              />
            </div>

            {/* Notification mode */}
            <div style={{ display: "flex", gap: 8 }}>
              {(
                [
                  { key: "vibrate", label: "Vibrate", Icon: Vibrate },
                  { key: "sound", label: "Sound", Icon: Volume2 },
                  { key: "push", label: "Push", Icon: Smartphone },
                ] as const
              ).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setNotifMode(key)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    borderRadius: 10,
                    border: notifMode === key ? `1.5px solid ${colors.sunsetCoral}` : "1.5px solid #E2EBF3",
                    backgroundColor: notifMode === key ? "#FFF1EE" : "#fff",
                    color: notifMode === key ? colors.sunsetCoral : "#6B8CA8",
                    fontSize: 11,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Stop Progress card */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "#1A2E40",
                margin: "0 0 18px 0",
              }}
            >
              Stop Progress
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {stopProgress.map((stop, i) => {
                const isAlert = stop.status === "alert";
                const isArrived = stop.status === "arrived";
                const dotColor = isAlert
                  ? colors.sunsetCoral
                  : isArrived
                  ? "#22C55E"
                  : "#D1DCE5";

                return (
                  <div key={stop.name} style={{ display: "flex", gap: 14, position: "relative" }}>
                    {/* Line + dot */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        width: 20,
                        flexShrink: 0,
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          backgroundColor: dotColor,
                          border: isAlert || isArrived ? "none" : "2.5px solid #D1DCE5",
                          flexShrink: 0,
                          zIndex: 1,
                          marginTop: i === 0 ? 2 : 0,
                        }}
                      />
                      {i < stopProgress.length - 1 && (
                        <div
                          style={{
                            width: 2,
                            flex: 1,
                            backgroundColor: "#E8F0F7",
                            minHeight: 28,
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ paddingBottom: i < stopProgress.length - 1 ? 14 : 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isAlert || isArrived ? 700 : 500,
                          color: isAlert ? colors.sunsetCoral : isArrived ? "#22C55E" : "#1A2E40",
                          marginBottom: 2,
                        }}
                      >
                        {stop.name}
                      </div>
                      <div style={{ fontSize: 11, color: "#6B8CA8" }}>{stop.detail}</div>
                      {stop.alertZone && (
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            color: colors.sunsetCoral,
                            backgroundColor: "#FFF1EE",
                            borderRadius: 6,
                            padding: "2px 8px",
                          }}
                        >
                          Alert zone
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}