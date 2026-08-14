import { useState } from "react";
import { Waves, Trees, Anchor, Landmark, Church, Building2, Plus, Minus } from "lucide-react";
import { colors } from "../theme/colors";
import { places, routeChainCoral, routeChainNavy, placeDetails } from "../data/places";

const iconMap = { waves: Waves, trees: Trees, anchor: Anchor, landmark: Landmark, church: Church, building: Building2 };

function coordsFor(ids: string[]) {
  return ids
    .map((id) => places.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p!.x},${p!.y}`)
    .join(" ");
}

export default function PangasinanMap() {
  const [selected, setSelected] = useState<string | null>("alaminos");
  const detail = selected ? placeDetails[selected] : null;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: 620,
        borderRadius: 18,
        overflow: "hidden",
        backgroundColor: colors.oceanBlueLight,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Island landmass */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <path
          d="M 8 40 C 6 25, 20 10, 40 8 C 55 6, 65 12, 62 22 C 78 18, 95 30, 92 48 C 95 65, 80 82, 60 85 C 45 92, 20 88, 12 70 C 4 60, 6 50, 8 40 Z"
          fill={colors.islandGreen}
        />
        {/* Gulf inlet cut */}
        <path
          d="M 30 12 C 45 14, 60 20, 68 30 C 55 32, 40 30, 30 24 C 26 20, 27 15, 30 12 Z"
          fill={colors.oceanBlueLight}
        />
        {/* Route lines */}
        <polyline
          points={coordsFor(routeChainCoral)}
          fill="none"
          stroke={colors.sunsetCoral}
          strokeWidth={0.4}
          strokeDasharray="1.2 1.2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={coordsFor(routeChainNavy)}
          fill="none"
          stroke={colors.oceanBlue}
          strokeWidth={0.4}
          strokeDasharray="1.2 1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Water label */}
      <div
        style={{
          position: "absolute",
          left: "38%",
          top: "16%",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: "#5A7A8C",
        }}
      >
        Lingayen Gulf
      </div>

      {/* "You" pin near Dagupan */}
      <div style={{ position: "absolute", left: "42%", top: "58%", transform: "translate(-50%,-50%)" }}>
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: colors.sunsetCoral,
            border: `3px solid ${colors.white}`,
            boxShadow: "0 0 0 6px rgba(241,107,78,0.25)",
          }}
        />
        <span
          style={{
            position: "absolute",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: colors.oceanBlue,
            whiteSpace: "nowrap",
          }}
        >
          You
        </span>
      </div>

      {/* Place pins */}
      {places.map((p) => {
        const Icon = iconMap[p.icon];
        const isSelected = selected === p.id;
        return (
          <div
            key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%,-50%)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                backgroundColor: colors.white,
                border: `2px solid ${isSelected ? colors.sunsetCoral : colors.oceanBlue}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 10px rgba(11,60,93,0.15)",
              }}
            >
              <Icon size={20} color={colors.oceanBlue} />
            </div>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                backgroundColor: isSelected ? colors.sunsetCoral : colors.oceanBlue,
                color: colors.white,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 10px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </span>
          </div>
        );
      })}

      {/* Zoom controls */}
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {[Plus, Minus].map((Icon, i) => (
          <button
            key={i}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "none",
              backgroundColor: colors.white,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              cursor: "pointer",
            }}
          >
            <Icon size={16} color={colors.oceanBlue} />
          </button>
        ))}
      </div>

      {/* Selected location popup */}
      {detail && (
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            width: 260,
            backgroundColor: colors.white,
            borderRadius: 14,
            padding: 16,
            boxShadow: "0 8px 24px rgba(11,60,93,0.18)",
          }}
        >
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              letterSpacing: 1,
              color: colors.textMuted,
              marginBottom: 4,
            }}
          >
            SELECTED LOCATION
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: colors.oceanBlue,
            }}
          >
            {detail.name}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>
            {detail.address}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {detail.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  backgroundColor: colors.oceanBlueLight,
                  color: colors.oceanBlue,
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <button
            style={{
              width: "100%",
              padding: "10px 0",
              borderRadius: 10,
              border: "none",
              backgroundColor: colors.sunsetCoral,
              color: colors.white,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Add to Itinerary
          </button>
        </div>
      )}
    </div>
  );
}