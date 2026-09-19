import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BookmarkPlus, Bus, CheckCircle2, Clock, Wallet, Zap } from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const destinations = [
  "Hundred Islands",
  "Patar Beach",
  "Manaoag Shrine",
  "Lingayen",
  "Bolinao",
  "Urdaneta",
];

const preferences = [
  "Budget-friendly",
  "Island hopping",
  "Cultural sites",
  "Food stops",
  "Photography spots",
  "Accessible routes",
];

const features = [
  {
    icon: Clock,
    iconBg: colors.oceanBlueLight,
    iconColor: colors.oceanBlue,
    title: "Smart Timing",
    desc: "AI picks optimal departure times to avoid traffic and peak hours",
  },
  {
    icon: Wallet,
    iconBg: colors.palmGreenLight,
    iconColor: colors.palmGreen,
    title: "Budget-Aware",
    desc: "Each stop is balanced to keep your total spend within budget",
  },
  {
    icon: Bus,
    iconBg: colors.coralLight,
    iconColor: colors.sunsetCoral,
    title: "Transit-Smart",
    desc: "Routes use real Pangasinan jeepney and bus schedules",
  },
];

const destinationIcon = {
  "Hundred Islands": "waves",
  "Patar Beach": "waves",
  "Manaoag Shrine": "church",
  "Lingayen": "anchor",
  "Bolinao": "trees",
  "Urdaneta": "building",
};

export default function AIItinerary() {
  const [destination, setDestination] = useState(destinations[0]);
  const [budget, setBudget] = useState("2000");
  const [days, setDays] = useState(1);
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const toggle = (value) =>
    setPrefs((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );

  const generate = async () => {
    setLoading(true);
    setError(null);
    setItinerary(null);
    setSaved(false);
    setSaveError(null);
    try {
      const result = await api.generateItinerary({
        destination,
        budget,
        days,
        preferences: prefs,
      });
      setItinerary(result);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to generate itinerary."
      );
    } finally {
      setLoading(false);
    }
  };

  const saveToTrips = async () => {
    if (!itinerary) return;
    setSaving(true);
    setSaveError(null);
    try {
      // Calculate total estimated cost
      const totalSpent = itinerary.days?.reduce(
        (all, day) =>
          all + day.stops.reduce((sum, stop) => sum + (stop.estimatedCost || 0), 0),
        0
      ) || 0;

      // Build date string
      const today = new Date();
      const tripDate = today.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      // Count total stops
      const totalStops = itinerary.days?.reduce(
        (sum, day) => sum + day.stops.length, 0
      ) || 0;

      // Create the trip
      await api.createTrip({
        title: `${destination} Trip`,
        location: `${destination}, Pangasinan`,
        date: tripDate,
        budget: Number(budget),
        spent: totalSpent,
        stops: totalStops,
        icon: destinationIcon[destination] ?? "landmark",
        status: "UPCOMING",
      });

      setSaved(true);
    } catch (cause) {
      setSaveError(
        cause instanceof Error ? cause.message : "Failed to save trip."
      );
    } finally {
      setSaving(false);
    }
  };

  const grandTotal =
    itinerary?.days?.reduce(
      (all, day) =>
        all + day.stops.reduce((sum, stop) => sum + (stop.estimatedCost || 0), 0),
      0
    ) || 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>AI Itinerary Planner</Text>
        <Text style={styles.subtitle}>
          Smart trip planning powered by Groq AI
        </Text>
      </View>

      {/* Planner Card */}
      <View style={styles.card}>
        <View style={styles.dashedBorder} />
        <Text style={styles.cardHeading}>Where do you want to go?</Text>

        {/* Destination */}
        <Text style={styles.label}>Destination</Text>
        <View style={styles.destinationGrid}>
          {destinations.map((item) => {
            const active = destination === item;
            return (
              <Pressable
                key={item}
                onPress={() => setDestination(item)}
                style={[styles.destBtn, active && styles.destBtnActive]}
              >
                <Text style={[styles.destText, active && styles.destTextActive]}>
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Budget + Days */}
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip Budget (₱)</Text>
            <TextInput
              value={budget}
              onChangeText={setBudget}
              keyboardType="numeric"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Number of Days</Text>
            <View style={styles.dayRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((val) => {
                const active = days === val;
                return (
                  <Pressable
                    key={val}
                    onPress={() => setDays(val)}
                    style={[styles.dayBtn, active && styles.dayBtnActive]}
                  >
                    <Text style={[styles.dayBtnText, active && styles.dayBtnTextActive]}>
                      {val}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {/* Preferences */}
        <Text style={styles.label}>Travel Preferences</Text>
        <View style={styles.prefChips}>
          {preferences.map((pref) => {
            const selected = prefs.includes(pref);
            return (
              <Pressable
                key={pref}
                onPress={() => toggle(pref)}
                style={[styles.chip, selected && styles.chipActive]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                  {pref}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Generate Button */}
        <Pressable
          onPress={generate}
          disabled={loading}
          style={[styles.generateBtn, loading && styles.generateBtnDisabled]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Zap size={18} color="#fff" />
          )}
          <Text style={styles.generateBtnText}>
            {loading ? "Generating your itinerary..." : "Generate AI Itinerary"}
          </Text>
        </Pressable>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Generated Itinerary */}
      {itinerary && (
        <View style={styles.card}>
          <View style={styles.dashedBorder} />

          {/* Itinerary header + save button */}
          <View style={styles.itineraryHeader}>
            <Text style={styles.cardHeading}>
              Your {days}-Day {destination} Itinerary
            </Text>

            {saved ? (
              <View style={styles.savedBadge}>
                <CheckCircle2 size={14} color={colors.palmGreen} />
                <Text style={styles.savedBadgeText}>Saved to My Trips</Text>
              </View>
            ) : (
              <Pressable
                onPress={saveToTrips}
                disabled={saving}
                style={({ pressed }) => [
                  styles.saveBtn,
                  saving && styles.saveBtnDisabled,
                  pressed && { opacity: 0.85 },
                ]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <BookmarkPlus size={15} color="#fff" />
                )}
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : "Save to My Trips"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Save error */}
          {saveError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}

          {/* Save success tip */}
          {saved && (
            <View style={styles.successBox}>
              <CheckCircle2 size={14} color={colors.palmGreen} />
              <Text style={styles.successText}>
                Your trip has been saved! View it in{" "}
                <Text style={styles.successLink}>My Trips</Text>. The budget
                breakdown is also visible in the{" "}
                <Text style={styles.successLink}>Budget</Text> page.
              </Text>
            </View>
          )}

          {/* Trip summary bar */}
          <View style={styles.tripSummaryBar}>
            <View style={styles.tripSummaryItem}>
              <Text style={styles.tripSummaryLabel}>Destination</Text>
              <Text style={styles.tripSummaryValue}>{destination}</Text>
            </View>
            <View style={styles.tripSummaryDivider} />
            <View style={styles.tripSummaryItem}>
              <Text style={styles.tripSummaryLabel}>Duration</Text>
              <Text style={styles.tripSummaryValue}>{days} day{days > 1 ? "s" : ""}</Text>
            </View>
            <View style={styles.tripSummaryDivider} />
            <View style={styles.tripSummaryItem}>
              <Text style={styles.tripSummaryLabel}>Budget</Text>
              <Text style={styles.tripSummaryValue}>₱{Number(budget).toLocaleString()}</Text>
            </View>
            <View style={styles.tripSummaryDivider} />
            <View style={styles.tripSummaryItem}>
              <Text style={styles.tripSummaryLabel}>Est. Cost</Text>
              <Text style={[
                styles.tripSummaryValue,
                { color: grandTotal > Number(budget) ? colors.sunsetCoral : colors.palmGreen }
              ]}>
                ₱{grandTotal.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Days */}
          {itinerary.days?.map((plan) => {
            const dayTotal = plan.stops.reduce(
              (sum, stop) => sum + (stop.estimatedCost || 0),
              0
            );
            return (
              <View key={plan.day} style={styles.dayBlock}>
                <View style={styles.dayHeader}>
                  <View style={styles.dayCircle}>
                    <Text style={styles.dayCircleText}>{plan.day}</Text>
                  </View>
                  <Text style={styles.dayTitle}>Day {plan.day}</Text>
                  <View style={styles.dayTotalPill}>
                    <Text style={styles.dayTotalPillText}>
                      ₱{dayTotal.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {plan.stops.map((stop, i) => (
                  <View
                    key={`${stop.time}-${i}`}
                    style={[
                      styles.stopRow,
                      i < plan.stops.length - 1 && styles.stopBorder,
                    ]}
                  >
                    <View style={styles.timeBadge}>
                      <Text style={styles.timeBadgeText}>{stop.time}</Text>
                    </View>
                    <View style={styles.stopDetails}>
                      <Text style={styles.stopPlace}>{stop.place}</Text>
                      <Text style={styles.stopActivity}>{stop.activity}</Text>
                    </View>
                    <Text style={styles.stopCost}>
                      ₱{stop.estimatedCost?.toLocaleString() ?? "—"}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })}

          {/* Grand total */}
          <View style={styles.grandTotalBox}>
            <View>
              <Text style={styles.grandTotalLabel}>Total Estimated Cost</Text>
              <Text style={styles.grandTotalSub}>
                Budget: ₱{Number(budget).toLocaleString()} ·{" "}
                {grandTotal <= Number(budget) ? (
                  <Text style={{ color: colors.palmGreen }}>Within budget ✓</Text>
                ) : (
                  <Text style={{ color: colors.sunsetCoral }}>Over budget</Text>
                )}
              </Text>
            </View>
            <Text style={styles.grandTotalCost}>
              ₱{grandTotal.toLocaleString()}
            </Text>
          </View>

          {/* Bottom save button */}
          {!saved && (
            <Pressable
              onPress={saveToTrips}
              disabled={saving}
              style={[styles.saveBottomBtn, saving && styles.saveBtnDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <BookmarkPlus size={16} color="#fff" />
              )}
              <Text style={styles.saveBtnText}>
                {saving ? "Saving..." : "Save this itinerary to My Trips"}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Feature Cards */}
      <View style={styles.featureRow}>
        {features.map(({ icon: Icon, iconBg, iconColor, title, desc }) => (
          <View key={title} style={styles.featureCard}>
            <View style={[styles.featureIconBox, { backgroundColor: iconBg }]}>
              <Icon size={18} color={iconColor} />
            </View>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F9FB" },
  screen: { flexGrow: 1, padding: 32, paddingBottom: 48 },

  header: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: "700", color: "#1A2E40", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#6B8CA8" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  dashedBorder: {
    borderTopWidth: 2,
    borderTopColor: "#D6E4EF",
    borderStyle: "dashed",
    marginBottom: 24,
  },
  cardHeading: { fontSize: 20, fontWeight: "700", color: "#1A2E40", marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "500", color: "#6B8CA8", marginBottom: 10 },

  destinationGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  destBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 10,
    minWidth: 140,
  },
  destBtnActive: { backgroundColor: colors.oceanBlue, borderColor: colors.oceanBlue },
  destText: { fontSize: 14, color: "#1A2E40" },
  destTextActive: { color: "#fff", fontWeight: "600" },

  inputRow: { flexDirection: "row", gap: 20, marginBottom: 24 },
  inputGroup: { flex: 1 },
  input: {
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 10,
    fontSize: 14,
    color: "#1A2E40",
    backgroundColor: "#fff",
  },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 8,
  },
  dayBtnActive: { backgroundColor: colors.oceanBlue, borderColor: colors.oceanBlue },
  dayBtnText: { fontSize: 14, color: "#1A2E40" },
  dayBtnTextActive: { color: "#fff", fontWeight: "700" },

  prefChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 32 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#D6E4EF",
    backgroundColor: "#fff",
  },
  chipActive: { borderColor: "#1A3A5C", backgroundColor: "#EAF1F8" },
  chipText: { fontSize: 13, color: "#4A6880" },
  chipTextActive: { color: "#1A3A5C", fontWeight: "600" },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.sunsetCoral,
  },
  generateBtnDisabled: { backgroundColor: "#B0C4D4" },
  generateBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  errorBox: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: colors.coralLight },
  errorText: { fontSize: 13, color: colors.sunsetCoral },

  // Itinerary header
  itineraryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.palmGreen,
    flexShrink: 0,
  },
  saveBtnDisabled: { backgroundColor: "#B0C4D4" },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.palmGreenLight,
  },
  savedBadgeText: { fontSize: 12, fontWeight: "700", color: colors.palmGreen },

  successBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.palmGreenLight,
    marginBottom: 16,
  },
  successText: { fontSize: 13, color: "#2A7B4C", flex: 1, lineHeight: 20 },
  successLink: { fontWeight: "700", color: colors.palmGreen },

  // Trip summary bar
  tripSummaryBar: {
    flexDirection: "row",
    backgroundColor: "#F4F8FC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 0,
  },
  tripSummaryItem: { flex: 1, alignItems: "center" },
  tripSummaryDivider: {
    width: 1,
    backgroundColor: "#E2EBF3",
    marginVertical: 4,
  },
  tripSummaryLabel: { fontSize: 11, color: "#6B8CA8", marginBottom: 4 },
  tripSummaryValue: { fontSize: 13, fontWeight: "700", color: "#1A2E40" },

  // Days
  dayBlock: { marginBottom: 28 },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.oceanBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  dayTitle: { fontSize: 16, fontWeight: "700", color: "#1A2E40", flex: 1 },
  dayTotalPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: colors.oceanBlueLight,
  },
  dayTotalPillText: { fontSize: 12, fontWeight: "700", color: colors.oceanBlue },

  stopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    paddingVertical: 16,
  },
  stopBorder: { borderBottomWidth: 1, borderBottomColor: "#F0F5FA" },
  timeBadge: {
    backgroundColor: colors.coralLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 70,
    alignItems: "center",
  },
  timeBadgeText: { fontSize: 12, fontWeight: "600", color: colors.sunsetCoral },
  stopDetails: { flex: 1 },
  stopPlace: { fontSize: 14, fontWeight: "700", color: "#1A2E40", marginBottom: 4 },
  stopActivity: { fontSize: 13, color: "#6B8CA8" },
  stopCost: { fontSize: 13, fontWeight: "700", color: colors.palmGreen },

  grandTotalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.oceanBlueLight,
    marginTop: 8,
    marginBottom: 16,
  },
  grandTotalLabel: { fontSize: 15, fontWeight: "700", color: colors.oceanBlue },
  grandTotalSub: { fontSize: 12, color: "#4A6880", marginTop: 4 },
  grandTotalCost: { fontSize: 18, fontWeight: "700", color: colors.sunsetCoral },

  saveBottomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.palmGreen,
  },

  // Feature cards
  featureRow: { flexDirection: "row", gap: 16 },
  featureCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: { fontSize: 14, fontWeight: "600", color: "#1A2E40", marginBottom: 6 },
  featureDesc: { fontSize: 13, color: "#6B8CA8", lineHeight: 20 },
});