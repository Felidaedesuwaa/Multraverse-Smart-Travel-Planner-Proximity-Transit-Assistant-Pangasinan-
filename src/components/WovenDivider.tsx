import { colors } from "../theme/colors";

export default function WovenDivider({
  color = colors.sunsetCoral,
  count = 26,
}: {
  color?: string;
  count?: number;
}) {
  return (
    <div style={{ display: "flex", gap: 3, marginBottom: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 3,
            height: 9,
            borderRadius: 1,
            backgroundColor: color,
            opacity: i % 3 === 0 ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  );
}