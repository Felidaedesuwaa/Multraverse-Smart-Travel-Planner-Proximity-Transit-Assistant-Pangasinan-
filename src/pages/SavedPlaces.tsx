import { useState } from "react";
import { Search, Plus, Navigation, X } from "lucide-react";
import { colors } from "../theme/colors";
import { savedPlaces, type SavedPlace } from "../data/places";
import { placeIconMap } from "../utils/placeIcons";

const categoryStyles: Record<string, { bg: string; text: string }> = {
  "Nature Park": { bg: colors.palmGreenLight, text: colors.palmGreen },
  Beach: { bg: colors.coralLight, text: colors.sunsetCoral },
  Religious: { bg: colors.goldLight, text: colors.gold },
  Restaurant: { bg: colors.palmGreenLight, text: colors.palmGreen },
  Landmark: { bg: colors.oceanBlueLight, text: colors.oceanBlue },
  Waterway: { bg: colors.coralLight, text: colors.sunsetCoral },
};

function PlaceCard({ place }: { place: SavedPlace }) {
  const Icon = placeIconMap[place.icon];
  const badge = categoryStyles[place.category] ?? { bg: colors.oceanBlueLight, text: colors.oceanBlue };

  return (
    <div
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${colors.border}`,
        boxShadow: "0 4px 14px rgba(11, 60, 93, 0.06)",
      }}
    >
      <div
        style={{
          height: 96,
          backgroundColor: "#F4F6F5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(11,60,93,0.08)",
          }}
        >
          <Icon size={24} color={colors.oceanBlue} />
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: colors.oceanBlue }}>
            {place.name}
          </span>
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 10px",
              borderRadius: 999,
              color: badge.text,
              backgroundColor: badge.bg,
              whiteSpace: "nowrap",
            }}
          >
            {place.category}
          </span>
        </div>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: colors.textMuted,
            margin: "0 0 16px",
            minHeight: 36,
          }}
        >
          {place.description}
        </p>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              backgroundColor: colors.sunsetCoral,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add to Trip
          </button>
          <button
            aria-label="Get directions"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1.5px solid ${colors.border}`,
              backgroundColor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Navigation size={15} color={colors.oceanBlue} />
          </button>
          <button
            aria-label="Remove from saved places"
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              border: `1.5px solid ${colors.coralLight}`,
              backgroundColor: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={15} color={colors.sunsetCoral} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SavedPlaces() {
  const [query, setQuery] = useState("");

  const filtered = savedPlaces.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main style={{ flex: 1, backgroundColor: colors.warmSand, padding: 28, overflowY: "auto" }}>
      {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
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
              Saved Places
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
              {savedPlaces.length} locations saved
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                color={colors.textMuted}
                style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved..."
                style={{
                  padding: "11px 14px 11px 38px",
                  borderRadius: 10,
                  border: `1.5px solid ${colors.border}`,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: colors.textPrimary,
                  outline: "none",
                  width: 200,
                }}
              />
            </div>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 20px",
                borderRadius: 10,
                border: "none",
                backgroundColor: colors.oceanBlue,
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Place
            </button>
          </div>
        </div>

        {/* Place cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {filtered.map((place) => (
          <PlaceCard key={place.id} place={place} />
        ))}
      </div>
    </main>
  );
}