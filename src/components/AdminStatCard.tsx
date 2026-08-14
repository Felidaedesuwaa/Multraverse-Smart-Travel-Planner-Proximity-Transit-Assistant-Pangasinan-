import type { ReactNode } from "react";
import { colors } from "../theme/colors";
import Card from "./Card";
import WovenDivider from "./WovenDivider";

export default function AdminStatCard({
  label,
  value,
  delta,
  icon,
  iconBg,
  dividerColor,
}: {
  label: string;
  value: string;
  delta: string;
  icon: ReactNode;
  iconBg: string;
  dividerColor?: string;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <WovenDivider color={dividerColor ?? colors.sunsetCoral} count={20} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.5,
              color: colors.textMuted,
              marginBottom: 8,
            }}
          >
            {label.toUpperCase()}
          </div>
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 26, fontWeight: 700, color: colors.textPrimary }}>
            {value}
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: iconBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted, marginTop: 8 }}>
        {delta}
      </div>
    </Card>
  );
}