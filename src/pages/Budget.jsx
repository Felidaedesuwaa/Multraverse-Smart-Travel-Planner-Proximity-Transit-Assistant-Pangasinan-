import MoneyAmount from "../components/MoneyAmount";
import { useCurrency } from "../hooks/useCurrency";
import MoneyInput from "../components/MoneyInput";
import { useAppTheme } from "../theme/useAppTheme";
import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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
  Pencil,
} from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const EXPENSE_COLORS = [
  "#0B3C5D", "#F16B4E", "#2A7B4C", "#C89B3C",
  "#7B5EA7", "#3B82F6", "#EF4444", "#10B981",
];

const CATEGORIES = [
  "Transport", "Food", "Accommodation", "Entrance Fees",
  "Activities", "Shopping", "Emergency", "Others",
];

// ── Stat Card ───────────────────────────────────────────
function StatCard({ label, value, sub, icon, iconBg, valueColor, onPress }) {
  const { themeStyle, themeColor } = useAppTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={themeStyle(styles.statCard)}>
      <View style={themeStyle([styles.statIconBox, { backgroundColor: iconBg }])}>
        {icon}
      </View>
      <Text style={themeStyle(styles.statLabel)}>{label}</Text>
      <Text style={themeStyle([styles.statValue, valueColor && { color: valueColor }])}>
        {value}
      </Text>
      {sub && <Text style={themeStyle(styles.statSub)}>{sub}</Text>}
      {onPress && <View style={themeStyle(styles.editHint)}><Pencil size={12} color={themeColor("#6B8CA8", "color")} /><Text style={themeStyle(styles.editHintText)}>Edit</Text></View>}
    </Pressable>
  );
}

// ── Progress Bar ────────────────────────────────────────
function ProgressBar({ label, amount, total, color, rightLabel }) {
  const { themeStyle, themeColor } = useAppTheme();

  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
  return (
    <View style={themeStyle(styles.barItem)}>
      <View style={themeStyle(styles.barHeader)}>
        <Text style={themeStyle(styles.barLabel)} numberOfLines={1}>{label}</Text>
        <Text style={themeStyle(styles.barAmount)}>{rightLabel ?? <MoneyAmount value={amount} />}</Text>
      </View>
      <View style={themeStyle(styles.track)}>
        <View style={[themeStyle(styles.fill), { width: `${pct}%`, backgroundColor: themeColor(color) }]} />
      </View>
    </View>
  );
}

// ── Add Expense Modal ───────────────────────────────────
function AddExpenseModal({ visible, trips, onClose, onAdded }) {
  const { currency } = useCurrency();

  const { themeStyle, themeColor } = useAppTheme();

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
        category,
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
      <Pressable style={themeStyle(styles.overlay)} onPress={onClose}>
        <Pressable style={themeStyle(styles.modalBox)} onPress={() => {}}>
          {/* Header */}
          <View style={themeStyle(styles.modalHeader)}>
            <Text style={themeStyle(styles.modalTitle)}>Add Expense</Text>
            <Pressable onPress={onClose} style={themeStyle(styles.closeBtn)}>
              <X size={18} color={themeColor("#6B8CA8", "color")} />
            </Pressable>
          </View>

          {/* Label */}
          <View style={themeStyle(styles.formGroup)}>
            <Text style={themeStyle(styles.formLabel)}>Expense Label *</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Boat rental, Lunch at Lucap"
              placeholderTextColor={themeColor("#A8BECC", "color")}
              style={themeStyle(styles.formInput)}
            />
          </View>

          {/* Amount */}
          <View style={themeStyle(styles.formGroup)}>
            <Text style={themeStyle(styles.formLabel)}>Amount ({currency}) *</Text>
            <MoneyInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={themeColor("#A8BECC", "color")}
              style={themeStyle(styles.formInput)}
            />
          </View>

          {/* Category */}
          <View style={themeStyle(styles.formGroup)}>
            <Text style={themeStyle(styles.formLabel)}>Category</Text>
            <View style={themeStyle(styles.categoryGrid)}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={themeStyle([
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ])}
                >
                  <Text
                    style={themeStyle([
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ])}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Link to trip */}
          {trips.length > 0 && (
            <View style={themeStyle(styles.formGroup)}>
              <Text style={themeStyle(styles.formLabel)}>Link to Trip (optional)</Text>
              <View style={themeStyle(styles.tripChips)}>
                <Pressable
                  onPress={() => setTripId(null)}
                  style={themeStyle([styles.tripChip, !tripId && styles.tripChipActive])}
                >
                  <Text style={themeStyle([styles.tripChipText, !tripId && styles.tripChipTextActive])}>
                    None
                  </Text>
                </Pressable>
                {trips.map((t) => (
                  <Pressable
                    key={t._id ?? t.id}
                    onPress={() => setTripId(t._id ?? t.id)}
                    style={themeStyle([
                      styles.tripChip,
                      tripId === (t._id ?? t.id) && styles.tripChipActive,
                    ])}
                  >
                    <Text
                      style={themeStyle([
                        styles.tripChipText,
                        tripId === (t._id ?? t.id) && styles.tripChipTextActive,
                      ])}
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
          <View style={themeStyle(styles.formGroup)}>
            <Text style={themeStyle(styles.formLabel)}>Color Tag</Text>
            <View style={themeStyle(styles.colorRow)}>
              {EXPENSE_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={themeStyle([
                    styles.colorDot,
                    { backgroundColor: c },
                    color === c && styles.colorDotActive,
                  ])}
                />
              ))}
            </View>
          </View>

          {error && (
            <View style={themeStyle(styles.errorBox)}>
              <Text style={themeStyle(styles.errorText)}>{error}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={themeStyle(styles.modalActions)}>
            <Pressable onPress={onClose} style={themeStyle(styles.cancelBtn)}>
              <Text style={themeStyle(styles.cancelText)}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleAdd}
              disabled={saving}
              style={themeStyle([styles.addBtn, saving && { opacity: 0.7 }])}
            >
              {saving && (
                <ActivityIndicator size="small" color={themeColor("#fff", "color")} style={themeStyle({ marginRight: 6 })} />
              )}
              <Text style={themeStyle(styles.addBtnText)}>
                {saving ? "Adding..." : "Add Expense"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function BudgetSettingsModal({ visible, settings, onClose, onSaved }) {
  const { themeStyle, themeColor } = useAppTheme();
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [savingsTarget, setSavingsTarget] = useState("");
  const [saving, setSaving] = useState(false), [error, setError] = useState(null);
  useEffect(() => { if (visible) { setMonthlyBudget(String(settings.monthlyBudget ?? "")); setSavingsTarget(String(settings.savingsTarget ?? "20")); setError(null); } }, [visible, settings]);
  const save = async () => {
    const budget = Number(monthlyBudget), target = Number(savingsTarget);
    if (!Number.isFinite(budget) || budget < 0 || !Number.isFinite(target) || target < 0 || target > 100) { setError("Enter a valid budget and a savings target from 0 to 100%."); return; }
    setSaving(true); try { onSaved(await api.updateBudgetSettings({ monthlyBudget: budget, savingsTarget: target })); onClose(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save budget settings."); } finally { setSaving(false); }
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><Pressable style={themeStyle(styles.overlay)} onPress={onClose}><Pressable style={themeStyle(styles.modalBox)} onPress={() => {}}><View style={themeStyle(styles.modalHeader)}><View><Text style={themeStyle(styles.modalTitle)}>Budget settings</Text><Text style={themeStyle(styles.modalSub)}>Set your own monthly limit and savings goal.</Text></View><Pressable onPress={onClose} style={themeStyle(styles.closeBtn)}><X size={18} color={themeColor("#6B8CA8", "color")} /></Pressable></View><View style={themeStyle(styles.formGroup)}><Text style={themeStyle(styles.formLabel)}>Monthly budget</Text><MoneyInput value={monthlyBudget} onChangeText={setMonthlyBudget} keyboardType="numeric" placeholder="0" style={themeStyle(styles.formInput)} /></View><View style={themeStyle(styles.formGroup)}><Text style={themeStyle(styles.formLabel)}>Savings target (%)</Text><TextInput value={savingsTarget} onChangeText={setSavingsTarget} keyboardType="numeric" placeholder="20" style={themeStyle(styles.formInput)} /></View><Text style={themeStyle(styles.settingsNote)}>Amount spent and remaining are calculated from your recorded expenses, so your balance always stays accurate.</Text>{error && <View style={themeStyle(styles.errorBox)}><Text style={themeStyle(styles.errorText)}>{error}</Text></View>}<View style={themeStyle(styles.modalActions)}><Pressable onPress={onClose} style={themeStyle(styles.cancelBtn)}><Text style={themeStyle(styles.cancelText)}>Cancel</Text></Pressable><Pressable onPress={save} disabled={saving} style={themeStyle(styles.addBtn)}>{saving && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />}<Text style={themeStyle(styles.addBtnText)}>{saving ? "Saving..." : "Save settings"}</Text></Pressable></View></Pressable></Pressable></Modal>;
}

// ── Trip Budget Section ─────────────────────────────────
function TripBudgetRow({ trip, entries }) {
  const { themeStyle, themeColor } = useAppTheme();

  const [expanded, setExpanded] = useState(false);
  const tripEntries = entries.filter(
    (e) => e.tripId === (trip._id ?? trip.id)
  );
  const actualSpent = tripEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const remaining = trip.budget - actualSpent;
  const pct = trip.budget > 0
    ? Math.min(100, (actualSpent / trip.budget) * 100)
    : 0;
  const over = actualSpent > trip.budget;

  return (
    <View style={themeStyle(styles.tripSection)}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={themeStyle(styles.tripSectionHeader)}
      >
        <View style={themeStyle(styles.tripSectionLeft)}>
          <Text style={themeStyle(styles.tripSectionName)}>{trip.title}</Text>
          <Text style={themeStyle(styles.tripSectionMeta)}>
            {trip.location} · {trip.status.toLowerCase()}
          </Text>
        </View>
        <View style={themeStyle(styles.tripSectionRight)}>
          <Text style={themeStyle([styles.tripRemaining, over && { color: colors.sunsetCoral }])}>
            <MoneyAmount value={Math.abs(remaining)} suffix={over ? " over" : " left"} />
          </Text>
          {expanded
            ? <ChevronUp size={16} color={themeColor("#6B8CA8", "color")} />
            : <ChevronDown size={16} color={themeColor("#6B8CA8", "color")} />}
        </View>
      </Pressable>

      {trip.plan?.costs && <View style={themeStyle({ paddingHorizontal: 18, paddingBottom: 12 })}><Text style={themeStyle({ fontFamily: "DMSans", color: colors.textMuted })}>Planned known subtotal: <MoneyAmount value={trip.plan.costs.knownTotal} /> ({trip.plan.costs.status}). This is separate from actual expenses.</Text>{Object.entries(trip.plan.costs.categories).map(([category, amount]) => <Text key={category} style={themeStyle({ fontFamily: "DMSans", color: colors.textPrimary })}>{category}: <MoneyAmount value={amount} /></Text>)}</View>}
      {/* Progress */}
      <View style={themeStyle(styles.tripProgress)}>
        <View style={themeStyle(styles.track)}>
          <View
            style={themeStyle([
              styles.fill,
              {
                width: `${pct}%`,
                backgroundColor: over ? colors.sunsetCoral : colors.oceanBlue,
              },
            ])}
          />
        </View>
        <View style={themeStyle(styles.tripProgressLabels)}>
          <Text style={themeStyle(styles.tripProgressSub)}>
            <MoneyAmount value={actualSpent} suffix=" spent" />
          </Text>
          <Text style={themeStyle(styles.tripProgressSub)}>
            <MoneyAmount value={trip.budget} suffix=" budget" />
          </Text>
        </View>
      </View>

      {/* Expanded entries */}
      {expanded && tripEntries.length > 0 && (
        <View style={themeStyle(styles.tripEntries)}>
          {tripEntries.map((entry) => (
            <View key={entry._id ?? entry.id} style={themeStyle(styles.tripEntry)}>
              <View
                style={themeStyle([styles.entryDot, { backgroundColor: entry.color }])}
              />
              <Text style={themeStyle(styles.tripEntryLabel)}>{entry.label}</Text>
              <Text style={themeStyle(styles.tripEntryAmount)}>
                <MoneyAmount value={entry.amount} />
              </Text>
            </View>
          ))}
        </View>
      )}
      {expanded && tripEntries.length === 0 && (
        <Text style={themeStyle(styles.noEntriesText)}>
          No expenses linked to this trip.
        </Text>
      )}
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────
export default function Budget() {
  const { width } = useWindowDimensions();
  const contentWidth = width >= 768 ? width - 280 : width;
  const { themeStyle, themeColor } = useAppTheme();

  const [entries, setEntries] = useState([]);
  const [trips, setTrips] = useState([]);
  const [settings, setSettings] = useState({ monthlyBudget: 8000, savingsTarget: 20 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    Promise.all([api.getBudget(), api.getTrips(), api.getBudgetSettings()])
      .then(([budget, tripList, budgetSettings]) => {
        if (!alive) return;
        setEntries(budget);
        setTrips(tripList);
        setSettings(budgetSettings || { monthlyBudget: 8000, savingsTarget: 20 });
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []));

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

  const monthlyBudget = Number(settings.monthlyBudget) || 0;
  const spent = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const remaining = monthlyBudget - spent;
  const savingsRate = monthlyBudget > 0 ? Math.max(0, Math.round((remaining / monthlyBudget) * 100)) : 0;
  const maxAmount = Math.max(...entries.map((e) => e.amount), 1);

  // Group by category
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const catEntries = entries.filter((e) => e.category === cat);
    if (catEntries.length > 0) {
      acc[cat] = catEntries.reduce((s, e) => s + e.amount, 0);
    }
    return acc;
  }, {});

  return (
    <ScrollView
      style={themeStyle(styles.container)}
      contentContainerStyle={themeStyle(styles.screen)}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={themeStyle([styles.header, contentWidth < 520 && { flexDirection: "column", gap: 16 }])}>
        <View>
          <Text style={themeStyle(styles.title)}>Budget Tracker</Text>
          <Text style={themeStyle(styles.subtitle)}>
            {new Date().toLocaleString("en-PH", { month: "long", year: "numeric" })} · Pangasinan travels
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAdd(true)}
          style={themeStyle(styles.addExpenseBtn)}
        >
          <Plus size={15} color={themeColor("#fff", "color")} />
          <Text style={themeStyle(styles.addExpenseBtnText)}>Add Expense</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={themeStyle(styles.loadingBox)}>
          <ActivityIndicator color={themeColor(colors.oceanBlue, "color")} size="large" />
          <Text style={themeStyle(styles.loadingText)}>Loading budget...</Text>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View style={themeStyle(styles.statsRow)}>
            <StatCard
              label="Monthly Budget"
              value={<MoneyAmount value={monthlyBudget} />}
              sub="Tap to set your limit"
              icon={<Wallet size={18} color={themeColor(colors.oceanBlue, "color")} />}
              iconBg={colors.oceanBlueLight}
              onPress={() => setShowSettings(true)}
            />
            <StatCard
              label="Amount Spent"
              value={<MoneyAmount value={spent} />}
              sub={`${entries.length} expense${entries.length !== 1 ? "s" : ""}`}
              icon={<TrendingUp size={18} color={themeColor(colors.sunsetCoral, "color")} />}
              iconBg={colors.coralLight}
              valueColor={spent > monthlyBudget ? colors.sunsetCoral : undefined}
            />
            <StatCard
              label="Remaining"
              value={<MoneyAmount value={Math.abs(remaining)} />}
              sub={remaining < 0 ? "Over budget" : "Available"}
              icon={<PiggyBank size={18} color={themeColor(colors.palmGreen, "color")} />}
              iconBg={colors.palmGreenLight}
              valueColor={remaining < 0 ? colors.sunsetCoral : colors.palmGreen}
            />
            <StatCard
              label="Savings Rate"
              value={`${savingsRate}%`}
              sub={`${settings.savingsTarget ?? 20}% target · ${savingsRate >= (settings.savingsTarget ?? 20) ? "On track" : "Below target"}`}
              icon={<Zap size={18} color={themeColor(colors.gold ?? "#C89B3C", "color")} />}
              iconBg={colors.goldLight ?? "#FFF8E1"}
            />
          </View>

          {/* Overall budget bar */}
          <View style={themeStyle(styles.overallCard)}>
            <View style={themeStyle(styles.overallHeader)}>
              <Text style={themeStyle(styles.overallTitle)}>Monthly Budget Usage</Text>
              <Text style={themeStyle(styles.overallPct)}>
                {monthlyBudget ? Math.min(100, Math.round((spent / monthlyBudget) * 100)) : 0}%
              </Text>
            </View>
            <View style={themeStyle([styles.track, { height: 10 }])}>
              <View
                style={themeStyle([
                  styles.fill,
                  {
                    width: `${monthlyBudget ? Math.min(100, (spent / monthlyBudget) * 100) : 0}%`,
                    backgroundColor:
                      spent > monthlyBudget
                        ? colors.sunsetCoral
                        : monthlyBudget && spent / monthlyBudget > 0.8
                        ? "#C89B3C"
                        : colors.palmGreen,
                  },
                ])}
              />
            </View>
            <View style={themeStyle(styles.overallLabels)}>
              <Text style={themeStyle(styles.overallSub)}>
                <MoneyAmount value={spent} suffix=" spent" />
              </Text>
              <Text style={themeStyle(styles.overallSub)}>
                <MoneyAmount value={monthlyBudget} suffix=" total" />
              </Text>
            </View>
          </View>

          {/* Main columns */}
          <View style={themeStyle([styles.columns, contentWidth < 800 && { flexDirection: "column" }])}>
            {/* Expense list */}
            <View style={themeStyle(styles.leftCol)}>
              <View style={themeStyle(styles.sectionCard)}>
                <View style={themeStyle(styles.sectionHeader)}>
                  <Text style={themeStyle(styles.sectionTitle)}>All Expenses</Text>
                  <Text style={themeStyle(styles.sectionCount)}>
                    {entries.length} entries
                  </Text>
                </View>

                {entries.length === 0 ? (
                  <View style={themeStyle(styles.emptyBox)}>
                    <Text style={themeStyle(styles.emptyTitle)}>No expenses yet</Text>
                    <Text style={themeStyle(styles.emptyDesc)}>
                      Tap "Add Expense" to start tracking your spending.
                    </Text>
                    <Pressable
                      onPress={() => setShowAdd(true)}
                      style={themeStyle(styles.emptyBtn)}
                    >
                      <Plus size={13} color={themeColor("#fff", "color")} />
                      <Text style={themeStyle(styles.emptyBtnText)}>Add First Expense</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {entries.map((entry, i) => (
                      <View
                        key={entry._id ?? entry.id}
                        style={themeStyle([
                          styles.entryRow,
                          i < entries.length - 1 && styles.entryBorder,
                        ])}
                      >
                        <View
                          style={themeStyle([
                            styles.entryColorBar,
                            { backgroundColor: entry.color },
                          ])}
                        />
                        <View style={themeStyle(styles.entryInfo)}>
                          <Text style={themeStyle(styles.entryLabel)}>{entry.label}</Text>
                          <Text style={themeStyle(styles.entrySub)}>
                            {entry.category || "Others"} · {" "}
                            {spent > 0
                              ? Math.round((entry.amount / spent) * 100)
                              : 0}
                            % of total spending
                          </Text>
                        </View>
                        <Text style={themeStyle(styles.entryAmount)}>
                          <MoneyAmount value={entry.amount} />
                        </Text>
                        <Pressable
                          onPress={() => handleDelete(entry._id ?? entry.id)}
                          style={themeStyle(styles.deleteEntryBtn)}
                        >
                          <Trash2 size={13} color={themeColor(colors.sunsetCoral, "color")} />
                        </Pressable>
                      </View>
                    ))}

                    {/* Total */}
                    <View style={themeStyle(styles.totalRow)}>
                      <Text style={themeStyle(styles.totalLabel)}>Total Spent</Text>
                      <Text style={themeStyle(styles.totalAmount)}>
                        <MoneyAmount value={spent} />
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Breakdown chart */}
            <View style={themeStyle(styles.rightCol)}>
              <View style={themeStyle(styles.sectionCard)}>
                <Text style={themeStyle(styles.sectionTitle)}>Expense Breakdown</Text>
                <View style={themeStyle({ marginTop: 16, gap: 14 })}>
                  {entries.length === 0 ? (
                    <Text style={themeStyle(styles.emptyDesc)}>No expenses to show.</Text>
                  ) : (
                    entries.map((entry) => (
                      <ProgressBar
                        key={entry._id ?? entry.id}
                        label={entry.label}
                        amount={entry.amount}
                        total={maxAmount}
                        color={entry.color}
                        rightLabel={<MoneyAmount value={entry.amount} prefix={`${spent > 0 ? Math.round((entry.amount / spent) * 100) : 0}% · `} />}
                      />
                    ))
                  )}
                </View>
                {entries.length > 0 && (
                  <View style={themeStyle(styles.breakdownTotal)}>
                    <Text style={themeStyle(styles.totalLabel)}>Total</Text>
                    <Text style={themeStyle(styles.totalAmount)}>
                      <MoneyAmount value={spent} />
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Per-trip budget */}
          {trips.length > 0 && (
            <View style={themeStyle(styles.sectionCard)}>
              <Text style={themeStyle(styles.sectionTitle)}>Per-Trip Budget</Text>
              <Text style={themeStyle(styles.sectionDesc)}>
                Tap a trip to see linked expenses. Save an AI Itinerary to automatically populate trip costs.
              </Text>
              <View style={themeStyle({ marginTop: 16, gap: 0 })}>
                {trips.map((trip, i) => (
                  <View
                    key={trip._id ?? trip.id}
                    style={themeStyle([
                      i < trips.length - 1 && styles.tripSectionBorder,
                    ])}
                  >
                    <TripBudgetRow trip={trip} entries={entries} />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Tips */}
          <View style={themeStyle(styles.tipsCard)}>
            <Text style={themeStyle(styles.tipsTitle)}>💡 Budget Tips</Text>
            <View style={themeStyle(styles.tipsList)}>
              {[
                "Use the AI Itinerary planner to estimate costs before your trip.",
                "Link expenses to trips to track spending per destination.",
                "Aim to keep transport under 30% of your total budget.",
                "Book accommodation early for lower rates in Pangasinan.",
              ].map((tip, i) => (
                <View key={i} style={themeStyle(styles.tipRow)}>
                  <View style={themeStyle(styles.tipDot)} />
                  <Text style={themeStyle(styles.tipText)}>{tip}</Text>
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
      <BudgetSettingsModal visible={showSettings} settings={settings} onClose={() => setShowSettings(false)} onSaved={setSettings} />
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
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 20 },
  statCard: {
    flex: 1,
    flexBasis: 160,
    minWidth: 160,
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
  editHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  editHintText: { fontSize: 11, color: "#6B8CA8", fontWeight: "600" },

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
    flexWrap: "wrap",
    gap: 12,
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
    flexWrap: "wrap",
    gap: 12,
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
  modalSub: { fontSize: 12, color: "#6B8CA8", marginTop: 3 },
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
  settingsNote: { fontSize: 12, lineHeight: 18, color: "#4A6880", backgroundColor: "#F0F7FA", borderRadius: 10, padding: 12 },
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
