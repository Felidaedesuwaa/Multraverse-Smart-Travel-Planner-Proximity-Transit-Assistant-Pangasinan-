import type { CSSProperties } from "react";
import { Plus, Wallet, TrendingUp, PiggyBank, Zap } from "lucide-react";
import { colors } from "../theme/colors";
import Card from "../components/Card";
import AdminStatCard from "../components/AdminStatCard";
import StatusBadge from "../components/StatusBadge";
import { budgetBreakdown, monthlyTrend, monthlyBudgetTotal, trips } from "../data/places";
import { placeIconMap } from "../utils/placeIcons";

const amountSpent = budgetBreakdown.reduce((sum, b) => sum + b.amount, 0);
const remaining = monthlyBudgetTotal - amountSpent;
const savingsRate = Math.round((remaining / monthlyBudgetTotal) * 100);
const maxCategory = Math.max(...budgetBreakdown.map((b) => b.amount));

export default function Budget() {
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
              Budget Tracker
            </h1>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: colors.textMuted, margin: "4px 0 0" }}>
              August 2026 · Pangasinan travels
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
              backgroundColor: colors.palmGreen,
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <AdminStatCard
            label="Total Budget"
            value={`₱${monthlyBudgetTotal.toLocaleString()}`}
            delta="This month"
            icon={<Wallet size={18} color={colors.oceanBlue} />}
            iconBg={colors.oceanBlueLight}
            dividerColor={colors.oceanBlue}
          />
          <AdminStatCard
            label="Amount Spent"
            value={`₱${amountSpent.toLocaleString()}`}
            delta="So far"
            icon={<TrendingUp size={18} color={colors.sunsetCoral} />}
            iconBg={colors.coralLight}
            dividerColor={colors.sunsetCoral}
          />
          <AdminStatCard
            label="Remaining"
            value={`₱${remaining.toLocaleString()}`}
            delta="Available"
            icon={<PiggyBank size={18} color={colors.palmGreen} />}
            iconBg={colors.palmGreenLight}
            dividerColor={colors.palmGreen}
          />
          <AdminStatCard
            label="Savings Rate"
            value={`${savingsRate}%`}
            delta="On target"
            icon={<Zap size={18} color={colors.gold} />}
            iconBg={colors.goldLight}
            dividerColor={colors.gold}
          />
        </div>

        {/* Expense breakdown + monthly trend */}
        <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
          <Card style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h2
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 17,
                  fontWeight: 700,
                  color: colors.oceanBlue,
                  margin: 0,
                }}
              >
                Expense Breakdown
              </h2>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: colors.oceanBlue,
                  backgroundColor: colors.oceanBlueLight,
                  padding: "4px 12px",
                  borderRadius: 999,
                }}
              >
                This month
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {budgetBreakdown.map((b) => (
                <div key={b.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          backgroundColor: b.color,
                          display: "inline-block",
                        }}
                      />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: colors.textPrimary }}>
                        {b.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
                        {Math.round((b.amount / amountSpent) * 100)}%
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 14,
                          fontWeight: 700,
                          color: colors.textPrimary,
                          minWidth: 46,
                          textAlign: "right",
                        }}
                      >
                        ₱{b.amount}
                      </span>
                    </div>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, backgroundColor: "#F0EBE0" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(b.amount / maxCategory) * 100}%`,
                        borderRadius: 999,
                        backgroundColor: b.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 18,
                paddingTop: 16,
                borderTop: `1px solid ${colors.border}`,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: colors.textPrimary,
              }}
            >
              <span>Total</span>
              <span>₱{amountSpent.toLocaleString()}</span>
            </div>
          </Card>

          <Card style={{ flex: 1 }}>
            <h2
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 17,
                fontWeight: 700,
                color: colors.oceanBlue,
                margin: "0 0 18px",
              }}
            >
              Monthly Trend
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {monthlyTrend.map((m) => {
                const overBudget = m.spent > m.budget;
                const pct = Math.min(100, (m.spent / m.budget) * 100);
                return (
                  <div key={m.month}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: colors.textPrimary }}>
                        {m.month}
                      </span>
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          fontWeight: 700,
                          color: overBudget ? colors.sunsetCoral : colors.textPrimary,
                        }}
                      >
                        ₱{m.spent.toLocaleString()} / ₱{m.budget.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 999, backgroundColor: "#EFEAE0" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 999,
                          backgroundColor: overBudget ? colors.sunsetCoral : colors.oceanBlue,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors.oceanBlue, display: "inline-block" }} />
                Under budget
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: colors.textMuted }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors.sunsetCoral, display: "inline-block" }} />
                Over budget
              </span>
            </div>
          </Card>
        </div>

        {/* Per-trip budget table */}
        <Card>
          <h2
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: colors.oceanBlue,
              margin: "0 0 16px",
            }}
          >
            Per-Trip Budget
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Trip", "Destination", "Budget", "Spent", "Remaining", "Status"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      letterSpacing: 0.5,
                      color: colors.textMuted,
                      fontWeight: 600,
                      padding: "8px 10px",
                      borderBottom: `1px solid ${colors.border}`,
                    }}
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const Icon = placeIconMap[trip.icon];
                const tripRemaining = trip.budget - trip.spent;
                return (
                  <tr key={trip.id}>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Icon size={15} color={colors.oceanBlue} />
                        <span style={{ fontWeight: 600, color: colors.oceanBlue }}>{trip.title}</span>
                      </div>
                    </td>
                    <td style={cellStyle}>{trip.location}</td>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>₱{trip.budget.toLocaleString()}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: colors.sunsetCoral }}>
                      ₱{trip.spent.toLocaleString()}
                    </td>
                    <td style={{ ...cellStyle, fontWeight: 600 }}>₱{tripRemaining.toLocaleString()}</td>
                    <td style={cellStyle}>
                      <StatusBadge status={trip.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
      </Card>
    </main>
  );
}

const cellStyle: CSSProperties = {
  padding: "12px 10px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 13,
  color: colors.textPrimary,
  borderBottom: `1px solid ${colors.border}`,
};