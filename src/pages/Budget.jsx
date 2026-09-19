import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  PiggyBank,
  Plus,
  TrendingUp,
  Trash2,
  Wallet,
  X,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const MONTHLY_BUDGET = 8000;

const EXPENSE_COLORS = [
  "#0B3C5D", "#F16B4E", "#2A7B4C", "#C89B3C",
  "#7B5EA7", "#3B82F6", "#EF4444", "#10B981",
];

const CATEGORIES = [
  "Transport", "Food", "Accommodation", "Entrance Fees",
  "Activities", "Shopping", "Emergency", "Others",
];

// ── Stat Card ───────────────────────────────────────────
function StatCard({ label, value, sub, icon, iconBg, valueColor }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor && { color: valueColor }]}>
        {value}
      </Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

// ── Progress Bar ────────────────────────────────────────
function ProgressBar({ label, amount, total, color, rightLabel }) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <View style={styles.barItem}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
        <Text style={styles.barAmount}>{rightLabel ?? `₱${amount.toLocaleString()}`}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Add Expense Modal ───────────────────────────────────
function AddExpenseModal({ visible, trips, onClose, onAdded }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Transport");
  const [tripId, setTripId] = useState(null);
  const [color, setColor] = useState(EXPENSE_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setLabel(""); setAmount(""); setCategory("Transport");
    setTripId(null); setColor(EXPENSE_COLORS[0]); setError(null);
  };

  const handleAdd = async () => {
    if (!label.trim()) { setError("Please enter an expense label."); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Please enter a valid amount."); return;
    }
    setSaving(true);
    setError(null);
    try {
      const entry = await api.createBudgetEntry({
        label: label.trim(),
        amount: Number(amount),
        color,
        tripId: tripId || undefined,
      });
      onAdded(entry);
      reset();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to add expense.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <X size={18} color="#6B8CA8" />
            </Pressable>
          </View>

          {/* Label */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Expense Label *</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Boat rental, Lunch at Lucap"
              placeholderTextColor="#A8BECC"
              style={styles.formInput}
            />
          </View>

          {/* Amount */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Amount (₱) *</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#A8BECC"
              style={styles.formInput}
            />
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Link to trip */}
          {trips.length > 0 && (
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Link to Trip (optional)</Text>
              <View style={styles.tripChips}>
                <Pressable
                  onPress={() => setTripId(null)}
                  style={[styles.tripChip, !tripId && styles.tripChipActive]}
                >
                  <Text style={[styles.tripChipText, !tripId && styles.tripChipTextActive]}>
                    None
                  </Text>
                </Pressable>
                {trips.map((t) => (
                  <Pressable
                    key={t._id ?? t.id}
                    onPress={() => setTripId(t._id ?? t.id)}
                    style={[
                      styles.tripChip,
                      tripId === (t._id ?? t.id) && styles.tripChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.tripChipText,
                        tripId === (t._id ?? t.id) && styles.tripChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {t.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Color picker */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Color Tag</Text>
            <View style={styles.colorRow}>
              {EXPENSE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={saving}
              style={[styles.addBtn, saving && { opacity: 0.7 }]}
            >
              {saving && (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.addBtnText}>
                {saving ? "Adding..." : "Add Expense"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Trip Budget Section ─────────────────────────────────
function TripBudgetRow({ trip, entries }) {
  const [expanded, setExpanded] = useState(false);
  const tripEntries = entries.filter(
    (e) => e.tripId === (trip._id ?? trip.id)
  );
  const remaining = trip.budget - trip.spent;
  const pct = trip.budget > 0
    ? Math.min(100, (trip.spent / trip.budget) * 100)
    : 0;
  const over = trip.spent > trip.budget;

  return (
    <View style={styles.tripSection}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.tripSectionHeader}
      >
        <View style={styles.tripSectionLeft}>
          <Text style={styles.tripSectionName}>{trip.title}</Text>
          <Text style={styles.tripSectionMeta}>
            {trip.location} · {trip.status.toLowerCase()}
          </Text>
        </View>
        <View style={styles.tripSectionRight}>
          <Text style={[styles.tripRemaining, over && { color: colors.sunsetCoral }]}>
            {over ? "₱" + Math.abs(remaining).toLocaleString() + " over" : "₱" + remaining.toLocaleString() + " left"}
          </Text>
          {expanded
            ? <ChevronUp size={16} color="#6B8CA8" />
            : <ChevronDown size={16} color="#6B8CA8" />}
        </View>
      </Pressable>

      {/* Progress */}
      <View style={styles.tripProgress}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${pct}%`,
                backgroundColor: over ? colors.sunsetCoral : colors.oceanBlue,
              },
            ]}
          />
        </View>
        <View style={styles.tripProgressLabels}>
          <Text style={styles.tripProgressSub}>
            ₱{trip.spent.toLocaleString()} spent
          </Text>
          <Text style={styles.tripProgressSub}>
            ₱{trip.budget.toLocaleString()} budget
          </Text>
        </View>
      </View>

      {/* Expanded entries */}
      {expanded && tripEntries.length > 0 && (
        <View style={styles.tripEntries}>
          {tripEntries.map((entry) => (
            <View key={entry._id ?? entry.id} style={styles.tripEntry}>
              <View
                style={[styles.entryDot, { backgroundColor: entry.color }]}
              />
              <Text style={styles.tripEntryLabel}>{entry.label}</Text>
              <Text style={styles.tripEntryAmount}>
                ₱{entry.amount.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
      {expanded && tripEntries.length === 0 && (
        <Text style={styles.noEntriesText}>
          No expenses linked to this trip.
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────
export default function Budget() {
  const [entries, setEntries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    Promise.all([api.getBudget(), api.getTrips()])
      .then(([budget, tripList]) => {
        setEntries(budget);
        setTrips(tripList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleAdded = (entry) => {
    setEntries((prev) => [entry, ...prev]);
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteBudgetEntry(id);
      setEntries((prev) => prev.filter((e) => (e._id ?? e.id) !== id));
    } catch {
      // silent
    }
  };

  const spent = entries.reduce((sum, e) => sum + e.amount, 0);
  const remaining = MONTHLY_BUDGET - spent;
  const savingsRate = Math.max(0, Math.round((remaining / MONTHLY_BUDGET) * 100));
  const maxAmount = Math.max(...entries.map((e) => e.amount), 1);

  // Group by category
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catEntries = entries.filter((e) =>
      e.label.toLowerCase().includes(cat.toLowerCase())
    );
    if (catEntries.length > 0) {
      acc[cat] = catEntries.reduce((s, e) => s + e.amount, 0);
    }
    return acc;
  }, {});

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Budget Tracker</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleString("en-PH", { month: "long", year: "numeric" })} · Pangasinan travels
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAdd(true)}
          style={styles.addExpenseBtn}
        >
          <Plus size={15} color="#fff" />
          <Text style={styles.addExpenseBtnText}>Add Expense</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.oceanBlue} size="large" />
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View style={styles.statsRow}>
            <StatCard
              label="Monthly Budget"
              value={`₱${MONTHLY_BUDGET.toLocaleString()}`}
              sub="This month"
              icon={<Wallet size={18} color={colors.oceanBlue} />}
              iconBg={colors.oceanBlueLight}
            />
            <StatCard
              label="Amount Spent"
              value={`₱${spent.toLocaleString()}`}
              sub={`${entries.length} expense${entries.length !== 1 ? "s" : ""}`}
              icon={<TrendingUp size={18} color={colors.sunsetCoral} />}
              iconBg={colors.coralLight}
              valueColor={spent > MONTHLY_BUDGET ? colors.sunsetCoral : undefined}
            />
            <StatCard
              label="Remaining"
              value={`₱${Math.abs(remaining).toLocaleString()}`}
              sub={remaining < 0 ? "Over budget" : "Available"}
              icon={<PiggyBank size={18} color={colors.palmGreen} />}
              iconBg={colors.palmGreenLight}
              valueColor={remaining < 0 ? colors.sunsetCoral : colors.palmGreen}
            />
            <StatCard
              label="Savings Rate"
              value={`${savingsRate}%`}
              sub={savingsRate >= 20 ? "On target " : "Low savings"}
              icon={<Zap size={18} color={colors.gold ?? "#C89B3C"} />}
              iconBg={colors.goldLight ?? "#FFF8E1"}
            />
          </View>

          {/* Overall budget bar */}
          <View style={styles.overallCard}>
            <View style={styles.overallHeader}>
              <Text style={styles.overallTitle}>Monthly Budget Usage</Text>
              <Text style={styles.overallPct}>
                {Math.min(100, Math.round((spent / MONTHLY_BUDGET) * 100))}%
              </Text>
            </View>
            <View style={[styles.track, { height: 10 }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.min(100, (spent / MONTHLY_BUDGET) * 100)}%`,
                    backgroundColor:
                      spent > MONTHLY_BUDGET
                        ? colors.sunsetCoral
                        : spent / MONTHLY_BUDGET > 0.8
                        ? "#C89B3C"
                        : colors.palmGreen,
                  },
                ]}
              />
            </View>
            <View style={styles.overallLabels}>
              <Text style={styles.overallSub}>
                ₱{spent.toLocaleString()} spent
              </Text>
              <Text style={styles.overallSub}>
                ₱{MONTHLY_BUDGET.toLocaleString()} total
              </Text>
            </View>
          </View>

          {/* Main columns */}
          <View style={styles.columns}>
            {/* Expense list */}
            <View style={styles.leftCol}>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>All Expenses</Text>
                  <Text style={styles.sectionCount}>
                    {entries.length} entries
                  </Text>
                </View>

                {entries.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyTitle}>No expenses yet</Text>
                    <Text style={styles.emptyDesc}>
                      Tap "Add Expense" to start tracking your spending.
                    </Text>
                    <Pressable
                      onPress={() => setShowAdd(true)}
                      style={styles.emptyBtn}
                    >
                      <Plus size={13} color="#fff" />
                      <Text style={styles.emptyBtnText}>Add First Expense</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {entries.map((entry, i) => (
                      <View
                        key={entry._id ?? entry.id}
                        style={[
                          styles.entryRow,
                          i < entries.length - 1 && styles.entryBorder,
                        ]}
                      >
                        <View
                          style={[
                            styles.entryColorBar,
                            { backgroundColor: entry.color },
                          ]}
                        />
                        <View style={styles.entryInfo}>
                          <Text style={styles.entryLabel}>{entry.label}</Text>
                          <Text style={styles.entrySub}>
                            {spent > 0
                              ? Math.round((entry.amount / spent) * 100)
                              : 0}
                            % of total spending
                          </Text>
                        </View>
                        <Text style={styles.entryAmount}>
                          ₱{entry.amount.toLocaleString()}
                        </Text>
                        <Pressable
                          onPress={() => handleDelete(entry._id ?? entry.id)}
                          style={styles.deleteEntryBtn}
                        >
                          <Trash2 size={13} color={colors.sunsetCoral} />
                        </Pressable>
                      </View>
                    ))}

                    {/* Total */}
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Total Spent</Text>
                      <Text style={styles.totalAmount}>
                        ₱{spent.toLocaleString()}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Breakdown chart */}
            <View style={styles.rightCol}>
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                <View style={{ marginTop: 16, gap: 14 }}>
                  {entries.length === 0 ? (
                    <Text style={styles.emptyDesc}>No expenses to show.</Text>
                  ) : (
                    entries.map((entry) => (
                      <ProgressBar
                        key={entry._id ?? entry.id}
                        label={entry.label}
                        amount={entry.amount}
                        total={maxAmount}
                        color={entry.color}
                        rightLabel={`${spent > 0 ? Math.round((entry.amount / spent) * 100) : 0}% · ₱${entry.amount.toLocaleString()}`}
                      />
                    ))
                  )}
                </View>
                {entries.length > 0 && (
                  <View style={styles.breakdownTotal}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>
                      ₱{spent.toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Per-trip budget */}
          {trips.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Per-Trip Budget</Text>
              <Text style={styles.sectionDesc}>
                Tap a trip to see linked expenses. Save an AI Itinerary to automatically populate trip costs.
              </Text>
              <View style={{ marginTop: 16, gap: 0 }}>
                {trips.map((trip, i) => (
                  <View
                    key={trip._id ?? trip.id}
                    style={[
                      i < trips.length - 1 && styles.tripSectionBorder,
                    ]}
                  >
                    <TripBudgetRow trip={trip} entries={entries} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tips */}
          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>💡 Budget Tips</Text>
            <View style={styles.tipsList}>
              {[
                "Use the AI Itinerary planner to estimate costs before your trip.",
                "Link expenses to trips to track spending per destination.",
                "Aim to keep transport under 30% of your total budget.",
                "Book accommodation early for lower rates in Pangasinan.",
              ].map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={showAdd}
        trips={trips}
        onClose={() => setShowAdd(false)}
        onAdded={handleAdded}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FB" },
  screen: { flexGrow: 1, padding: 28, paddingBottom: 48 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#1A2E40" },
  subtitle: { fontSize: 13, color: "#6B8CA8", marginTop: 4 },
  addExpenseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.palmGreen,
  },
  addExpenseBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  loadingBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { fontSize: 14, color: "#6B8CA8" },

  // Stats
  statsRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 18,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: "#6B8CA8", fontWeight: "500" },
  statValue: { fontSize: 20, fontWeight: "700", color: "#1A2E40" },
  statSub: { fontSize: 11, color: "#6B8CA8" },

  // Overall budget bar
  overallCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overallHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallTitle: { fontSize: 14, fontWeight: "700", color: "#1A2E40" },
  overallPct: { fontSize: 14, fontWeight: "700", color: colors.oceanBlue },
  overallLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  overallSub: { fontSize: 12, color: "#6B8CA8" },

  // Columns
  columns: { flexDirection: "row", gap: 20, marginBottom: 20 },
  leftCol: { flex: 1.2 },
  rightCol: { flex: 1 },

  // Section card
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A2E40" },
  sectionCount: { fontSize: 12, color: "#6B8CA8" },
  sectionDesc: { fontSize: 13, color: "#6B8CA8", marginTop: 6, lineHeight: 18 },

  // Empty state
  emptyBox: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1A2E40" },
  emptyDesc: { fontSize: 13, color: "#6B8CA8", textAlign: "center", maxWidth: 260 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.palmGreen,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Entry rows
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
  },
  entryBorder: { borderBottomWidth: 1, borderBottomColor: "#F0F5FA" },
  entryColorBar: { width: 4, height: 36, borderRadius: 2 },
  entryInfo: { flex: 1 },
  entryLabel: { fontSize: 14, fontWeight: "600", color: "#1A2E40", marginBottom: 2 },
  entrySub: { fontSize: 11, color: "#6B8CA8" },
  entryAmount: { fontSize: 14, fontWeight: "700", color: "#1A2E40" },
  deleteEntryBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#FFF1EE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Totals
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2EBF3",
  },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#1A2E40" },
  totalAmount: { fontSize: 14, fontWeight: "700", color: "#1A2E40" },
  breakdownTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2EBF3",
  },

  // Progress bar
  barItem: { gap: 6 },
  barHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: { fontSize: 13, color: "#1A2E40", flex: 1 },
  barAmount: { fontSize: 12, fontWeight: "700", color: "#1A2E40" },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#EFEAE0",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },

  // Trip sections
  tripSection: { paddingVertical: 16 },
  tripSectionBorder: { borderBottomWidth: 1, borderBottomColor: "#F0F5FA" },
  tripSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  tripSectionLeft: { flex: 1, paddingRight: 12 },
  tripSectionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tripSectionName: { fontSize: 14, fontWeight: "700", color: "#1A2E40", marginBottom: 2 },
  tripSectionMeta: { fontSize: 12, color: "#6B8CA8" },
  tripRemaining: { fontSize: 13, fontWeight: "700", color: colors.palmGreen },
  tripProgress: { gap: 6 },
  tripProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tripProgressSub: { fontSize: 11, color: "#6B8CA8" },
  tripEntries: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  tripEntry: { flexDirection: "row", alignItems: "center", gap: 8 },
  entryDot: { width: 8, height: 8, borderRadius: 4 },
  tripEntryLabel: { flex: 1, fontSize: 13, color: "#4A6880" },
  tripEntryAmount: { fontSize: 13, fontWeight: "700", color: "#1A2E40" },
  noEntriesText: {
    fontSize: 12,
    color: "#6B8CA8",
    marginTop: 8,
    fontStyle: "italic",
  },

  // Tips
  tipsCard: {
    backgroundColor: colors.oceanBlueLight,
    borderRadius: 14,
    padding: 20,
    gap: 12,
  },
  tipsTitle: { fontSize: 14, fontWeight: "700", color: colors.oceanBlue },
  tipsList: { gap: 8 },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.oceanBlue,
    marginTop: 5,
    flexShrink: 0,
  },
  tipText: { fontSize: 13, color: "#4A6880", lineHeight: 18, flex: 1 },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A2E40" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
  },

  // Form
  formGroup: { gap: 8 },
  formLabel: { fontSize: 12, fontWeight: "600", color: "#6B8CA8" },
  formInput: {
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 10,
    fontSize: 14,
    color: "#1A2E40",
    backgroundColor: "#fff",
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
  },
  categoryChipActive: {
    borderColor: colors.oceanBlue,
    backgroundColor: colors.oceanBlueLight,
  },
  categoryChipText: { fontSize: 12, color: "#4A6880" },
  categoryChipTextActive: { color: colors.oceanBlue, fontWeight: "700" },
  tripChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tripChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
    maxWidth: 150,
  },
  tripChipActive: {
    borderColor: colors.sunsetCoral,
    backgroundColor: "#FFF1EE",
  },
  tripChipText: { fontSize: 12, color: "#4A6880" },
  tripChipTextActive: { color: colors.sunsetCoral, fontWeight: "700" },
  colorRow: { flexDirection: "row", gap: 10 },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  colorDotActive: {
    borderColor: "#1A2E40",
    transform: [{ scale: 1.15 }],
  },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFF1EE",
  },
  errorText: { fontSize: 13, color: colors.sunsetCoral },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
  },
  cancelText: { fontSize: 13, fontWeight: "600", color: "#4A6880" },
  addBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.palmGreen,
  },
  addBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});