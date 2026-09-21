import MoneyAmount from "../components/MoneyAmount";
import { useCurrency } from "../hooks/useCurrency";
import MoneyInput from "../components/MoneyInput";
import { useAppTheme } from "../theme/useAppTheme";
import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import ItineraryResult from "../components/ItineraryResult";
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
  Calendar,
  ChevronRight,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";
import { placeIconMap } from "../utils/placeIcons";

const TABS = [
  { key: "all", label: "All" },
  { key: "UPCOMING", label: "Upcoming" },
  { key: "COMPLETED", label: "Completed" },
];

const STATUS_STYLE = {
  UPCOMING: { bg: colors.coralLight, text: colors.sunsetCoral },
  COMPLETED: { bg: colors.palmGreenLight, text: colors.palmGreen },
};

// ── Trip Detail Modal ───────────────────────────────────
function TripDetailModal({ trip, onClose, onDelete }) {
  const { themeStyle, themeColor } = useAppTheme();

  if (!trip) return null;
  const Icon = placeIconMap[trip.icon] ?? placeIconMap.landmark;
  const progress = trip.budget > 0
    ? Math.min(100, (trip.spent / trip.budget) * 100)
    : 0;
  const status = STATUS_STYLE[trip.status] ?? STATUS_STYLE.UPCOMING;
  const remaining = trip.budget - trip.spent;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={themeStyle(styles.modalOverlay)} onPress={onClose}>
        <Pressable style={themeStyle(styles.modalBox)} onPress={() => {}}>
          <ScrollView style={themeStyle(styles.modalScroll)} contentContainerStyle={themeStyle(styles.modalContent)} showsVerticalScrollIndicator>
          {/* Header */}
          <View style={themeStyle(styles.modalHeader)}>
            <View style={themeStyle(styles.modalIconBox)}>
              <Icon size={22} color={themeColor(colors.oceanBlue, "color")} />
            </View>
            <View style={themeStyle({ flex: 1 })}>
              <Text style={themeStyle(styles.modalTitle)}>{trip.title}</Text>
              <Text style={themeStyle(styles.modalMeta)}>
                {trip.location} · {trip.date}
              </Text>
            </View>
            <Pressable onPress={onClose} style={themeStyle(styles.closeBtn)}>
              <X size={18} color={themeColor("#6B8CA8", "color")} />
            </Pressable>
          </View>

          {/* Status badge */}
          <View style={themeStyle([styles.modalStatusBadge, { backgroundColor: status.bg }])}>
            <View style={themeStyle([styles.statusDot, { backgroundColor: status.text }])} />
            <Text style={themeStyle([styles.modalStatusText, { color: status.text }])}>
              {trip.status.charAt(0) + trip.status.slice(1).toLowerCase()}
            </Text>
          </View>

          {/* Budget breakdown */}
          <View style={themeStyle(styles.modalSection)}>
            <Text style={themeStyle(styles.modalSectionTitle)}>Budget Breakdown</Text>
            <View style={themeStyle(styles.budgetGrid)}>
              <View style={themeStyle(styles.budgetItem)}>
                <Text style={themeStyle(styles.budgetItemLabel)}>Total Budget</Text>
                <Text style={themeStyle(styles.budgetItemValue)}>
                  <MoneyAmount value={trip.budget} />
                </Text>
              </View>
              <View style={themeStyle(styles.budgetDivider)} />
              <View style={themeStyle(styles.budgetItem)}>
                <Text style={themeStyle(styles.budgetItemLabel)}>Spent</Text>
                <Text style={themeStyle([styles.budgetItemValue, { color: colors.sunsetCoral }])}>
                  <MoneyAmount value={trip.spent} />
                </Text>
              </View>
              <View style={themeStyle(styles.budgetDivider)} />
              <View style={themeStyle(styles.budgetItem)}>
                <Text style={themeStyle(styles.budgetItemLabel)}>Remaining</Text>
                <Text
                  style={themeStyle([
                    styles.budgetItemValue,
                    { color: remaining >= 0 ? colors.palmGreen : colors.sunsetCoral },
                  ])}
                >
                  <MoneyAmount value={Math.abs(remaining)} suffix={remaining < 0 ? " over" : ""} />
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={themeStyle(styles.modalTrack)}>
              <View
                style={themeStyle([
                  styles.modalFill,
                  {
                    width: `${progress}%`,
                    backgroundColor:
                      progress >= 100 ? colors.sunsetCoral : colors.palmGreen,
                  },
                ])}
              />
            </View>
            <Text style={themeStyle(styles.progressLabel)}>
              {Math.round(progress)}% of budget used
            </Text>
          </View>

          {trip.plan?.version === 1 && <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled><ItineraryResult plan={trip.plan} showMap={false} /></ScrollView>}

          {/* Trip info */}
          <View style={themeStyle(styles.modalSection)}>
            <Text style={themeStyle(styles.modalSectionTitle)}>Trip Info</Text>
            <View style={themeStyle(styles.infoRow)}>
              <MapPin size={14} color={themeColor("#6B8CA8", "color")} />
              <Text style={themeStyle(styles.infoText)}>{trip.location}</Text>
            </View>
            <View style={themeStyle(styles.infoRow)}>
              <Calendar size={14} color={themeColor("#6B8CA8", "color")} />
              <Text style={themeStyle(styles.infoText)}>{trip.date}</Text>
            </View>
            <View style={themeStyle(styles.infoRow)}>
              <ChevronRight size={14} color={themeColor("#6B8CA8", "color")} />
              <Text style={themeStyle(styles.infoText)}>{trip.stops} stops planned</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={themeStyle(styles.modalActions)}>
            <Pressable
              onPress={() => onDelete(trip._id ?? trip.id)}
              style={themeStyle(styles.deleteBtn)}
            >
              <Trash2 size={15} color={themeColor(colors.sunsetCoral, "color")} />
              <Text style={themeStyle(styles.deleteBtnText)}>Delete Trip</Text>
            </Pressable>
            <Pressable onPress={onClose} style={themeStyle(styles.doneBtn)}>
              <Text style={themeStyle(styles.doneBtnText)}>Done</Text>
            </Pressable>
          </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── New Trip Modal ──────────────────────────────────────
function NewTripModal({ visible, onClose, onCreated }) {
  const { currency } = useCurrency();

  const { themeStyle, themeColor } = useAppTheme();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setTitle("");
    setLocation("");
    setDate("");
    setBudget("");
    setError(null);
  };

  const handleCreate = async () => {
    if (!title.trim() || !location.trim()) {
      setError("Title and location are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const newTrip = await api.createTrip({
        title: title.trim(),
        location: location.trim(),
        date: date.trim() || new Date().toLocaleDateString("en-PH", {
          month: "short", day: "numeric", year: "numeric",
        }),
        budget: Number(budget) || 0,
        spent: 0,
        stops: 0,
        icon: "landmark",
        status: "UPCOMING",
      });
      onCreated(newTrip);
      reset();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to create trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={themeStyle(styles.modalOverlay)} onPress={onClose}>
        <Pressable style={themeStyle(styles.modalBox)} onPress={() => {}}>
          <View style={themeStyle(styles.modalHeader)}>
            <Text style={themeStyle(styles.modalTitle)}>Create New Trip</Text>
            <Pressable onPress={onClose} style={themeStyle(styles.closeBtn)}>
              <X size={18} color={themeColor("#6B8CA8", "color")} />
            </Pressable>
          </View>

          <View style={themeStyle(styles.formGroup)}>
            <Text style={themeStyle(styles.formLabel)}>Trip Title *</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Hundred Islands Adventure"
              placeholderTextColor={themeColor("#A8BECC", "color")}
              style={themeStyle(styles.formInput)}
            />
          </View>

          <View style={themeStyle(styles.formGroup)}>
            <Text style={themeStyle(styles.formLabel)}>Location *</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Alaminos, Pangasinan"
              placeholderTextColor={themeColor("#A8BECC", "color")}
              style={themeStyle(styles.formInput)}
            />
          </View>

          <View style={themeStyle(styles.formRow)}>
            <View style={themeStyle([styles.formGroup, { flex: 1 }])}>
              <Text style={themeStyle(styles.formLabel)}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="e.g. Aug 20–22, 2026"
                placeholderTextColor={themeColor("#A8BECC", "color")}
                style={themeStyle(styles.formInput)}
              />
            </View>
            <View style={themeStyle([styles.formGroup, { flex: 1 }])}>
              <Text style={themeStyle(styles.formLabel)}>Budget ({currency})</Text>
              <MoneyInput
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={themeColor("#A8BECC", "color")}
                style={themeStyle(styles.formInput)}
              />
            </View>
          </View>

          {error && (
            <View style={themeStyle(styles.errorBox)}>
              <Text style={themeStyle(styles.errorText)}>{error}</Text>
            </View>
          )}

          <View style={themeStyle(styles.modalActions)}>
            <Pressable onPress={onClose} style={themeStyle(styles.cancelBtn)}>
              <Text style={themeStyle(styles.cancelBtnText)}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleCreate}
              disabled={saving}
              style={themeStyle([styles.doneBtn, saving && { opacity: 0.7 }])}
            >
              {saving && (
                <ActivityIndicator size="small" color={themeColor("#fff", "color")} style={themeStyle({ marginRight: 6 })} />
              )}
              <Text style={themeStyle(styles.doneBtnText)}>
                {saving ? "Creating..." : "Create Trip"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Trip Card ───────────────────────────────────────────
function TripCard({ trip, onView, onDelete, compact }) {
  const { themeStyle, themeColor } = useAppTheme();

  const Icon = placeIconMap[trip.icon] ?? placeIconMap.landmark;
  const completed = trip.status === "COMPLETED";
  const progress = trip.budget > 0
    ? Math.min(100, (trip.spent / trip.budget) * 100)
    : 0;
  const status = STATUS_STYLE[trip.status] ?? STATUS_STYLE.UPCOMING;

  return (
    <View style={themeStyle([styles.tripCard, compact && styles.tripCardCompact])}>
      {/* Top */}
      <View style={themeStyle(styles.tripTop)}>
        <View style={themeStyle(styles.tripIconBox)}>
          <Icon size={20} color={themeColor(colors.oceanBlue, "color")} />
        </View>
        <View style={themeStyle([styles.statusPill, { backgroundColor: status.bg }])}>
          <Text style={themeStyle([styles.statusText, { color: status.text }])}>
            {trip.status.charAt(0) + trip.status.slice(1).toLowerCase()}
          </Text>
        </View>
      </View>

      {/* Title + location */}
      <Text style={themeStyle(styles.tripTitle)} numberOfLines={1}>{trip.title}</Text>
      <View style={themeStyle(styles.tripMetaRow)}>
        <MapPin size={12} color={themeColor("#6B8CA8", "color")} />
        <Text style={themeStyle(styles.tripMeta)} numberOfLines={1}>
          {trip.location}
        </Text>
      </View>
      <View style={themeStyle(styles.tripMetaRow)}>
        <Calendar size={12} color={themeColor("#6B8CA8", "color")} />
        <Text style={themeStyle(styles.tripMeta)}>{trip.date}</Text>
      </View>

      {/* Budget progress */}
      <View style={themeStyle(styles.budgetSection)}>
        <View style={themeStyle(styles.budgetRow)}>
          <Text style={themeStyle(styles.budgetLabel)}>Budget progress</Text>
          <Text style={themeStyle(styles.budgetAmount)}>
            <MoneyAmount value={trip.spent} total={trip.budget} />
          </Text>
        </View>
        <View style={themeStyle(styles.track)}>
          <View
            style={themeStyle([
              styles.fill,
              {
                width: `${progress}%`,
                backgroundColor: completed ? colors.palmGreen : colors.sunsetCoral,
              },
            ])}
          />
        </View>
        <Text style={themeStyle(styles.progressText)}>{Math.round(progress)}% used</Text>
      </View>

      {/* Footer */}
      <View style={themeStyle(styles.tripFooter)}>
        <Text style={themeStyle(styles.stopsText)}>{trip.stops} stops</Text>
        <View style={themeStyle(styles.tripActions)}>
          <Pressable
            onPress={() => onDelete(trip._id ?? trip.id)}
            style={themeStyle(styles.deleteIconBtn)}
          >
            <Trash2 size={14} color={themeColor(colors.sunsetCoral, "color")} />
          </Pressable>
          <Pressable onPress={() => onView(trip)} style={themeStyle(styles.viewBtn)}>
            <Text style={themeStyle(styles.viewBtnText)}>View</Text>
            <ChevronRight size={13} color={themeColor(colors.oceanBlue, "color")} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────
export default function MyTrips() {
  const { themeStyle, themeColor } = useAppTheme();
  const { width } = useWindowDimensions();
  const compact = (width >= 768 ? width - 280 : width) < 680;

  const [filter, setFilter] = useState("all");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showNewTrip, setShowNewTrip] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    api.getTrips()
      .then(data => { if (alive) setTrips(data); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []));

  const handleDelete = async (id) => {
    try {
      await api.deleteTrip(id);
      setTrips((prev) => prev.filter((t) => (t._id ?? t.id) !== id));
      setSelectedTrip(null);
    } catch {
      // handle silently
    }
  };

  const handleCreated = (newTrip) => {
    setTrips((prev) => [newTrip, ...prev]);
  };

  const filtered = trips.filter((t) => {
    const matchesFilter = filter === "all" || t.status === filter;
    const matchesSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.location.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const upcoming = trips.filter((t) => t.status === "UPCOMING").length;
  const completed = trips.filter((t) => t.status === "COMPLETED").length;

  return (
    <ScrollView
      style={themeStyle(styles.container)}
      contentContainerStyle={themeStyle(styles.screen)}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={themeStyle(styles.header)}>
        <View>
          <Text style={themeStyle(styles.title)}>My Trips</Text>
          <Text style={themeStyle(styles.headerSub)}>
            {upcoming} upcoming · {completed} completed
          </Text>
        </View>
        <Pressable
          onPress={() => setShowNewTrip(true)}
          style={themeStyle(styles.newTripBtn)}
        >
          <Plus size={16} color={themeColor("#fff", "color")} />
          <Text style={themeStyle(styles.newTripText)}>New Trip</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={themeStyle(styles.searchBox)}>
        <Search size={15} color={themeColor("#6B8CA8", "color")} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search trips..."
          placeholderTextColor={themeColor("#A8BECC", "color")}
          style={themeStyle(styles.searchInput)}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <X size={15} color={themeColor("#6B8CA8", "color")} />
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View style={themeStyle(styles.tabs)}>
        {TABS.map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={themeStyle([styles.tab, filter === key && styles.tabActive])}
          >
            <Text style={themeStyle([styles.tabText, filter === key && styles.tabTextActive])}>
              {label}
            </Text>
            {key !== "all" && (
              <View
                style={themeStyle([
                  styles.tabBadge,
                  filter === key && styles.tabBadgeActive,
                ])}
              >
                <Text
                  style={themeStyle([
                    styles.tabBadgeText,
                    filter === key && styles.tabBadgeTextActive,
                  ])}
                >
                  {key === "UPCOMING" ? upcoming : completed}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={themeStyle(styles.centerBox)}>
          <ActivityIndicator color={themeColor(colors.oceanBlue, "color")} size="large" />
          <Text style={themeStyle(styles.loadingText)}>Loading trips...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={themeStyle(styles.emptyBox)}>
          <Text style={themeStyle(styles.emptyTitle)}>
            {search
              ? "No trips match your search"
              : filter === "all"
              ? "No trips yet"
              : `No ${filter.toLowerCase()} trips`}
          </Text>
          <Text style={themeStyle(styles.emptyDesc)}>
            {search
              ? "Try a different search term."
              : "Generate an itinerary with AI or create a trip manually."}
          </Text>
          {!search && (
            <Pressable
              onPress={() => setShowNewTrip(true)}
              style={themeStyle(styles.emptyBtn)}
            >
              <Plus size={14} color={themeColor("#fff", "color")} />
              <Text style={themeStyle(styles.emptyBtnText)}>Create your first trip</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={themeStyle([styles.grid, compact && styles.gridCompact])}>
          {filtered.map((trip) => (
            <TripCard
              key={trip._id ?? trip.id}
              trip={trip}
              onView={setSelectedTrip}
              onDelete={handleDelete}
              compact={compact}
            />
          ))}
        </View>
      )}

      {/* Modals */}
      <TripDetailModal
        trip={selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onDelete={handleDelete}
      />
      <NewTripModal
        visible={showNewTrip}
        onClose={() => setShowNewTrip(false)}
        onCreated={handleCreated}
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
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#1A2E40" },
  headerSub: { fontSize: 13, color: "#6B8CA8", marginTop: 4 },
  newTripBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.sunsetCoral,
  },
  newTripText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1A2E40" },

  // Tabs
  tabs: { flexDirection: "row", gap: 8, marginBottom: 24 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: colors.oceanBlue },
  tabText: { fontSize: 14, fontWeight: "600", color: "#6B8CA8" },
  tabTextActive: { color: "#fff" },
  tabBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    backgroundColor: "#E2EBF3",
  },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  tabBadgeText: { fontSize: 11, fontWeight: "700", color: "#6B8CA8" },
  tabBadgeTextActive: { color: "#fff" },

  // States
  centerBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { fontSize: 14, color: "#6B8CA8" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A2E40" },
  emptyDesc: { fontSize: 14, color: "#6B8CA8", textAlign: "center", maxWidth: 300 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.oceanBlue,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // Grid
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16, alignItems: "stretch" },
  gridCompact: { flexDirection: "column" },

  // Trip card
  tripCard: {
    flexGrow: 1,
    flexBasis: 300,
    maxWidth: 520,
    minWidth: 0,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  tripCardCompact: { width: "100%", flexBasis: "auto", maxWidth: "100%", padding: 16 },
  tripTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  tripIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.oceanBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  tripTitle: { fontSize: 17, fontWeight: "700", color: "#1A2E40" },
  tripMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  tripMeta: { fontSize: 12, color: "#6B8CA8", flex: 1 },

  // Budget
  budgetSection: { marginTop: 8, gap: 6 },
  budgetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  budgetLabel: { fontSize: 12, color: "#6B8CA8" },
  budgetAmount: { fontSize: 12, fontWeight: "700", color: "#1A2E40" },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#EFEAE0",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 999 },
  progressText: { fontSize: 11, color: "#6B8CA8" },

  // Footer
  tripFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  stopsText: { fontSize: 12, color: "#6B8CA8" },
  tripActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.coralLight,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1EE",
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.oceanBlueLight,
    backgroundColor: "#fff",
  },
  viewBtnText: { fontSize: 12, fontWeight: "600", color: colors.oceanBlue },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalBox: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "88%",
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalScroll: { width: "100%" },
  modalContent: { padding: 24, gap: 16 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.oceanBlueLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1A2E40", flex: 1 },
  modalMeta: { fontSize: 13, color: "#6B8CA8", marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  modalStatusText: { fontSize: 12, fontWeight: "700" },

  // Modal sections
  modalSection: { gap: 10 },
  modalSectionTitle: { fontSize: 12, fontWeight: "700", color: "#6B8CA8", letterSpacing: 0.5 },
  budgetGrid: {
    flexDirection: "row",
    backgroundColor: "#F4F8FC",
    borderRadius: 12,
    padding: 16,
  },
  budgetItem: { flex: 1, alignItems: "center" },
  budgetDivider: { width: 1, backgroundColor: "#E2EBF3", marginVertical: 4 },
  budgetItemLabel: { fontSize: 11, color: "#6B8CA8", marginBottom: 4 },
  budgetItemValue: { fontSize: 15, fontWeight: "700", color: "#1A2E40" },
  modalTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#EFEAE0",
    overflow: "hidden",
    marginTop: 4,
  },
  modalFill: { height: "100%", borderRadius: 999 },
  progressLabel: { fontSize: 12, color: "#6B8CA8" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, color: "#4A6880" },

  // Modal actions
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.coralLight,
    backgroundColor: "#FFF1EE",
  },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: colors.sunsetCoral },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
  },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#4A6880" },
  doneBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.oceanBlue,
  },
  doneBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  // New trip form
  formGroup: { gap: 6 },
  formRow: { flexDirection: "row", gap: 12 },
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
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFF1EE",
  },
  errorText: { fontSize: 13, color: colors.sunsetCoral },
});
