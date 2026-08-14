import { colors } from "../theme/colors";
import StatusBadge from "./StatusBadge";

export default function SavedTripCard({
  title,
  status,
  date,
  progress,
}: {
  title: string;
  status: "upcoming" | "completed";
  date: string;
  progress: number;
}) {
  const barColor = status === "completed" ? colors.palmGreen : colors.sunsetCoral;
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: colors.white,
            maxWidth: 160,
          }}
        >
          {title}
        </span>
        <StatusBadge status={status} />
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8FB0C2", marginBottom: 8 }}>
        {date}
      </div>
      <div style={{ height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}>
        <div style={{ height: "100%", width: `${progress}%`, borderRadius: 999, backgroundColor: barColor }} />
      </div>
    </div>
  );
}