import { colors } from "../theme/colors";
import { budgetBreakdown } from "../data/places";
import WovenDivider from "./WovenDivider";

const TOTAL = budgetBreakdown.reduce((sum, b) => sum + b.amount, 0);
const MAX = Math.max(...budgetBreakdown.map((b) => b.amount));

export default function BudgetOverview() {
  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <WovenDivider />
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8FB0C2" }}>
        Total spent
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, marginBottom: 16 }}>
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 26,
            fontWeight: 700,
            color: colors.white,
          }}
        >
          ₱{TOTAL.toLocaleString()}
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: colors.palmGreen,
            backgroundColor: colors.palmGreenLight,
            padding: "3px 10px",
            borderRadius: 999,
          }}
        >
          On budget
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {budgetBreakdown.map((b) => (
          <div key={b.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: b.color,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#C9DAE3" }}>
                  {b.label}
                </span>
              </div>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.white }}>
                ₱{b.amount}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  height: "100%",
                  width: `${(b.amount / MAX) * 100}%`,
                  borderRadius: 999,
                  backgroundColor: b.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}