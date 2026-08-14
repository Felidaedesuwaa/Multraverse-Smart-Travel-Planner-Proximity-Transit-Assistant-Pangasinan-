import { colors } from "../theme/colors";

type Status = "upcoming" | "completed" | "active" | "inactive";

const styles: Record<Status, { bg: string; text: string }> = {
  upcoming: { bg: colors.coralLight, text: colors.sunsetCoral },
  completed: { bg: colors.palmGreenLight, text: colors.palmGreen },
  active: { bg: colors.palmGreenLight, text: colors.palmGreen },
  inactive: { bg: "#EFEFEF", text: colors.textMuted },
};

export default function StatusBadge({ status }: { status: Status }) {
  const s = styles[status];
  return (
    <span
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 600,
        padding: "4px 12px",
        borderRadius: 999,
        color: s.text,
        backgroundColor: s.bg,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}