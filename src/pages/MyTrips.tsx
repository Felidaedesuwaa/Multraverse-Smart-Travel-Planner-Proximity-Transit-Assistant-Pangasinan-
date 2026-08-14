import { useState } from "react";
import { Plus } from "lucide-react";
import { colors } from "../theme/colors";
import Card from "../components/Card";
import { trips, type Trip } from "../data/places";
import { placeIconMap } from "../utils/placeIcons";

type Filter = "all" | "upcoming" | "completed";

const tabs: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

function StatusPill({ status }: { status: Trip["status"] }) {
  const isUpcoming = status === "upcoming";
  return (
    <span
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: 999,
        color: isUpcoming ? colors.sunsetCoral : colors.palmGreen,
        backgroundColor: isUpcoming ? colors.coralLight : colors.palmGreenLight,
      }}
    >
      {status}
    </span>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const Icon = placeIconMap[trip.icon];
  const pct = trip.budget > 0 ? Math.min(100, (trip.spent / trip.budget) * 100) : 0;
  const barColor = trip.status === "completed" ? colors.palmGreen : colors.sunsetCoral;

  return (
    <Card style={{ padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.oceanBlueLight,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} color={colors.oceanBlue} />
        </div>
        <StatusPill status={trip.status} />
      </div>

      <div
        style={{
          fontFamily: "'Poppins', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          color: colors.oceanBlue,
          marginBottom: 4,
        }}
      >
        {trip.title}
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, marginBottom: 20 }}>
        {trip.location} · {trip.date}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
          Budget progress
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
          ₱{trip.spent.toLocaleString()} / ₱{trip.budget.toLocaleString()}
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, backgroundColor: "#EFEAE0", marginBottom: 18 }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, backgroundColor: barColor }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
          {trip.stops} stops planned
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              padding: "8px 18px",
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
            View
          </button>
          <button
            style={{
              padding: "8px 18px",
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
            Edit
          </button>
        </div>
      </div>
    </Card>
  );
}

export default function MyTrips() {
  const [filter, setFilter] = useState<Filter>("all");

  const upcomingCount = trips.filter((t) => t.status === "upcoming").length;
  const completedCount = trips.filter((t) => t.status === "completed").length;
  const filtered = filter === "all" ? trips : trips.filter((t) => t.status === filter);

  return (
    <main style={{ flex: 1, backgroundColor: colors.warmSand, padding: 28, overflowY: "auto" }}>
      {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                color: colors.oceanBlue,
                margin: 0,
              }}
            >
              My Trips
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
              {upcomingCount} upcoming · {completedCount} completed
            </p>
          </div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 20px",
              borderRadius: 12,
              border: "none",
              backgroundColor: colors.sunsetCoral,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            New Trip
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {tabs.map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: "9px 20px",
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: isActive ? colors.oceanBlue : "transparent",
                  color: isActive ? "#fff" : colors.textMuted,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Trip cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {filtered.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </main>
  );
}