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
  Bookmark,
  BookmarkCheck,
  Camera,
  Globe,
  Lock,
  MapPin,
  Navigation,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";
import { placeIconMap } from "../utils/placeIcons";

const CATEGORIES = [
  "All", "Nature Park", "Beach", "Religious",
  "Restaurant", "Landmark", "Waterway",
];

const CATEGORY_STYLE = {
  "Nature Park": { bg: colors.palmGreenLight, color: colors.palmGreen },
  Beach: { bg: colors.coralLight, color: colors.sunsetCoral },
  Religious: { bg: colors.goldLight ?? "#FFF8E1", color: colors.gold ?? "#C89B3C" },
  Restaurant: { bg: colors.palmGreenLight, color: colors.palmGreen },
  Landmark: { bg: colors.oceanBlueLight, color: colors.oceanBlue },
  Waterway: { bg: colors.coralLight, color: colors.sunsetCoral },
};

const PLACE_BG_COLORS = [
  "#EAF1FB", "#FFF1EE", "#EDF7EE", "#FFF8E1",
  "#F3EEF8", "#E8F5F0", "#FEF3F2",
];

// ── Star Rating ─────────────────────────────────────────
function StarRating({ rating, size = 14, onRate }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onRate && onRate(star)}
          disabled={!onRate}
        >
          <Star
            size={size}
            color={star <= rating ? "#F59E0B" : "#D1DCE5"}
            fill={star <= rating ? "#F59E0B" : "transparent"}
          />
        </Pressable>
      ))}
    </View>
  );
}

// ── Add/Edit Place Modal ────────────────────────────────
function PlaceFormModal({ visible, place, onClose, onSaved }) {
  const isEdit = !!place;
  const [name, setName] = useState(place?.name ?? "");
  const [category, setCategory] = useState(place?.category ?? "Landmark");
  const [description, setDescription] = useState(place?.description ?? "");
  const [userNote, setUserNote] = useState(place?.userNote ?? "");
  const [rating, setRating] = useState(place?.rating ?? 0);
  const [isPublic, setIsPublic] = useState(place?.isPublic ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cats = CATEGORIES.filter((c) => c !== "All");

  const handleSave = async () => {
    if (!name.trim()) { setError("Place name is required."); return; }
    setSaving(true);
    setError(null);
    try {
      let result;
      if (isEdit) {
        result = await api.updateSavedPlace(place._id ?? place.id, {
          name: name.trim(),
          category,
          description: description.trim(),
          userNote: userNote.trim(),
          rating,
          isPublic,
        });
      } else {
        result = await api.createSavedPlace({
          name: name.trim(),
          category,
          description: description.trim(),
          userNote: userNote.trim(),
          rating,
          isPublic,
          icon: "landmark",
        });
      }
      onSaved(result, isEdit);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to save place.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalBox} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEdit ? "Edit Place" : "Add New Place"}
              </Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={18} color="#6B8CA8" />
              </Pressable>
            </View>

            {/* Name */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Place Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Hundred Islands National Park"
                placeholderTextColor="#A8BECC"
                style={styles.formInput}
              />
            </View>

            {/* Category */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chipGrid}>
                {cats.map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.chip,
                      category === cat && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        category === cat && styles.chipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Description */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="What makes this place special?"
                placeholderTextColor="#A8BECC"
                style={[styles.formInput, styles.formTextarea]}
              />
            </View>

            {/* Personal Note */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>My Experience / Notes</Text>
              <TextInput
                value={userNote}
                onChangeText={setUserNote}
                multiline
                numberOfLines={3}
                placeholder="Share your experience here..."
                placeholderTextColor="#A8BECC"
                style={[styles.formInput, styles.formTextarea]}
              />
            </View>

            {/* Rating */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Your Rating</Text>
              <View style={styles.ratingRow}>
                <StarRating rating={rating} size={28} onRate={setRating} />
                <Text style={styles.ratingLabel}>
                  {rating === 0 ? "Tap to rate" :
                   rating === 1 ? "Poor" :
                   rating === 2 ? "Fair" :
                   rating === 3 ? "Good" :
                   rating === 4 ? "Very Good" : "Excellent"}
                </Text>
              </View>
            </View>

            {/* Visibility */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Visibility</Text>
              <View style={styles.visibilityRow}>
                <Pressable
                  onPress={() => setIsPublic(true)}
                  style={[styles.visBtn, isPublic && styles.visBtnActive]}
                >
                  <Globe size={14} color={isPublic ? colors.oceanBlue : "#6B8CA8"} />
                  <Text style={[styles.visBtnText, isPublic && styles.visBtnTextActive]}>
                    Public
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setIsPublic(false)}
                  style={[styles.visBtn, !isPublic && styles.visBtnActivePrivate]}
                >
                  <Lock size={14} color={!isPublic ? colors.sunsetCoral : "#6B8CA8"} />
                  <Text style={[styles.visBtnText, !isPublic && styles.visBtnTextPrivate]}>
                    Private
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.visHint}>
                {isPublic
                  ? "Other travelers can see your rating and notes."
                  : "Only you can see this place and your notes."}
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              >
                {saving && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving..." : isEdit ? "Save Changes" : "Add Place"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Place Detail Modal ──────────────────────────────────
function PlaceDetailModal({ place, onClose, onEdit, onDelete }) {
  if (!place) return null;
  const Icon = placeIconMap[place.icon] ?? placeIconMap.landmark;
  const catStyle = CATEGORY_STYLE[place.category] ?? CATEGORY_STYLE.Landmark;
  const bgColor = PLACE_BG_COLORS[
    Math.abs(place.name.charCodeAt(0)) % PLACE_BG_COLORS.length
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modalBox, styles.detailBox]} onPress={() => {}}>
          {/* Artwork header */}
          <View style={[styles.detailArt, { backgroundColor: bgColor }]}>
            <View style={styles.detailIconCircle}>
              <Icon size={32} color={colors.oceanBlue} />
            </View>
            <Pressable onPress={onClose} style={styles.detailClose}>
              <X size={18} color="#fff" />
            </Pressable>
            {place.isPublic !== false && (
              <View style={styles.publicTag}>
                <Globe size={10} color="#fff" />
                <Text style={styles.publicTagText}>Public</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Title row */}
            <View style={styles.detailTitleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailName}>{place.name}</Text>
                <View style={styles.detailMetaRow}>
                  <MapPin size={12} color="#6B8CA8" />
                  <Text style={styles.detailMeta}>{place.category}</Text>
                </View>
              </View>
              <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
                <Text style={[styles.catBadgeText, { color: catStyle.color }]}>
                  {place.category}
                </Text>
              </View>
            </View>

            {/* Rating */}
            <View style={styles.detailRatingBox}>
              <StarRating rating={place.rating ?? 0} size={20} />
              <Text style={styles.detailRatingText}>
                {place.rating > 0
                  ? `${place.rating}.0 / 5.0`
                  : "Not yet rated"}
              </Text>
            </View>

            {/* Description */}
            {place.description ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>About this place</Text>
                <Text style={styles.detailSectionText}>{place.description}</Text>
              </View>
            ) : null}

            {/* User note */}
            {place.userNote ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}> My Experience</Text>
                <Text style={styles.noteText}>{place.userNote}</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => { onClose(); onEdit(place); }}
                style={styles.addNoteBtn}
              >
                <Camera size={14} color={colors.oceanBlue} />
                <Text style={styles.addNoteBtnText}>
                  Add your experience & rating
                </Text>
              </Pressable>
            )}

            {/* Photo placeholder */}
            <View style={styles.photosSection}>
              <Text style={styles.detailSectionTitle}>Photos</Text>
              <View style={styles.photosGrid}>
                {[1, 2, 3].map((i) => (
                  <View key={i} style={[styles.photoSlot, { backgroundColor: bgColor }]}>
                    <Camera size={20} color="#A8BECC" />
                    <Text style={styles.photoSlotText}>Add photo</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.photoHint}>
                Photo uploads coming soon. Stay tuned!
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.detailActions}>
              <Pressable
                onPress={() => { onClose(); onEdit(place); }}
                style={styles.editDetailBtn}
              >
                <Text style={styles.editDetailBtnText}>Edit Place</Text>
              </Pressable>
              <Pressable style={styles.directionsBtn}>
                <Navigation size={14} color="#fff" />
                <Text style={styles.directionsBtnText}>Directions</Text>
              </Pressable>
              <Pressable
                onPress={() => onDelete(place._id ?? place.id)}
                style={styles.deleteDetailBtn}
              >
                <Trash2 size={14} color={colors.sunsetCoral} />
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Place Card ──────────────────────────────────────────
function PlaceCard({ place, onView, onDelete, index }) {
  const Icon = placeIconMap[place.icon] ?? placeIconMap.landmark;
  const catStyle = CATEGORY_STYLE[place.category] ?? CATEGORY_STYLE.Landmark;
  const bgColor = PLACE_BG_COLORS[index % PLACE_BG_COLORS.length];

  return (
    <Pressable
      onPress={() => onView(place)}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]}
    >
      {/* Art header */}
      <View style={[styles.cardArt, { backgroundColor: bgColor }]}>
        <View style={styles.cardIconCircle}>
          <Icon size={28} color={colors.oceanBlue} />
        </View>

        {/* Public badge */}
        {place.isPublic !== false && (
          <View style={styles.cardPublicBadge}>
            <Globe size={9} color="#fff" />
          </View>
        )}

        {/* Category badge */}
        <View style={[styles.cardCatBadge, { backgroundColor: catStyle.bg }]}>
          <Text style={[styles.cardCatText, { color: catStyle.color }]}>
            {place.category}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={1}>{place.name}</Text>

        {/* Rating */}
        <View style={styles.cardRatingRow}>
          <StarRating rating={place.rating ?? 0} size={12} />
          <Text style={styles.cardRatingText}>
            {place.rating > 0 ? `${place.rating}.0` : "No rating"}
          </Text>
        </View>

        {/* Description */}
        <Text style={styles.cardDesc} numberOfLines={2}>
          {place.description || "No description available."}
        </Text>

        {/* User note preview */}
        {place.userNote ? (
          <View style={styles.notePreview}>
            <Text style={styles.notePreviewText} numberOfLines={1}>
              📝 {place.userNote}
            </Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Pressable
            onPress={() => onView(place)}
            style={styles.viewBtn}
          >
            <BookmarkCheck size={13} color={colors.oceanBlue} />
            <Text style={styles.viewBtnText}>View</Text>
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete(place._id ?? place.id);
            }}
            style={styles.deleteCardBtn}
          >
            <Trash2 size={13} color={colors.sunsetCoral} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Screen ─────────────────────────────────────────
export default function SavedPlaces() {
  const [places, setPlaces] = useState([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPlace, setEditingPlace] = useState(null);
  const [viewingPlace, setViewingPlace] = useState(null);

  useEffect(() => {
    api.getSavedPlaces()
      .then(setPlaces)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    try {
      await api.deleteSavedPlace(id);
      setPlaces((prev) => prev.filter((p) => (p._id ?? p.id) !== id));
      setViewingPlace(null);
    } catch {}
  };

  const handleSaved = (place, isEdit) => {
    if (isEdit) {
      setPlaces((prev) =>
        prev.map((p) => (p._id ?? p.id) === (place._id ?? place.id) ? place : p)
      );
    } else {
      setPlaces((prev) => [place, ...prev]);
    }
  };

  const filtered = places.filter((p) => {
    const matchesQuery = `${p.name} ${p.category} ${p.description}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesCategory =
      categoryFilter === "All" || p.category === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  // Stats
  const avgRating = places.length
    ? (places.reduce((s, p) => s + (p.rating ?? 0), 0) / places.length).toFixed(1)
    : "0.0";
  const ratedCount = places.filter((p) => p.rating > 0).length;
  const publicCount = places.filter((p) => p.isPublic !== false).length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Saved Places</Text>
          <Text style={styles.subtitle}>
            {places.length} saved · {ratedCount} rated · {publicCount} public
          </Text>
        </View>
        <Pressable onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Plus size={15} color="#fff" />
          <Text style={styles.addBtnText}>Add Place</Text>
        </Pressable>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Bookmark size={13} color={colors.oceanBlue} />
          <Text style={styles.statChipText}>{places.length} Saved</Text>
        </View>
        <View style={styles.statChip}>
          <Star size={13} color="#F59E0B" fill="#F59E0B" />
          <Text style={styles.statChipText}>{avgRating} Avg Rating</Text>
        </View>
        <View style={styles.statChip}>
          <Globe size={13} color={colors.palmGreen} />
          <Text style={styles.statChipText}>{publicCount} Public</Text>
        </View>
        <View style={styles.statChip}>
          <Lock size={13} color={colors.sunsetCoral} />
          <Text style={styles.statChipText}>
            {places.length - publicCount} Private
          </Text>
        </View>
      </View>

      {/* Search + Category filter */}
      <View style={styles.filterRow}>
        <View style={styles.searchBox}>
          <Search size={15} color="#6B8CA8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search places..."
            placeholderTextColor="#A8BECC"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <X size={14} color="#6B8CA8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryRow}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setCategoryFilter(cat)}
            style={[
              styles.catTab,
              categoryFilter === cat && styles.catTabActive,
            ]}
          >
            <Text
              style={[
                styles.catTabText,
                categoryFilter === cat && styles.catTabTextActive,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.oceanBlue} size="large" />
          <Text style={styles.loadingText}>Loading your places...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}>
            <Bookmark size={32} color="#A8BECC" />
          </View>
          <Text style={styles.emptyTitle}>
            {query || categoryFilter !== "All"
              ? "No places match your filters"
              : "No saved places yet"}
          </Text>
          <Text style={styles.emptyDesc}>
            {query || categoryFilter !== "All"
              ? "Try different search terms or categories."
              : "Save places you've visited or plan to visit in Pangasinan."}
          </Text>
          {!query && categoryFilter === "All" && (
            <Pressable
              onPress={() => setShowAdd(true)}
              style={styles.emptyBtn}
            >
              <Plus size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Save your first place</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.grid}>
          {filtered.map((place, i) => (
            <PlaceCard
              key={place._id ?? place.id}
              place={place}
              index={i}
              onView={setViewingPlace}
              onDelete={handleDelete}
            />
          ))}
        </View>
      )}

      {/* Modals */}
      <PlaceFormModal
        visible={showAdd || !!editingPlace}
        place={editingPlace}
        onClose={() => { setShowAdd(false); setEditingPlace(null); }}
        onSaved={handleSaved}
      />
      <PlaceDetailModal
        place={viewingPlace}
        onClose={() => setViewingPlace(null)}
        onEdit={(p) => setEditingPlace(p)}
        onDelete={handleDelete}
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
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: "700", color: "#1A2E40" },
  subtitle: { fontSize: 13, color: "#6B8CA8", marginTop: 4 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.oceanBlue,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2EBF3",
  },
  statChipText: { fontSize: 12, fontWeight: "600", color: "#4A6880" },

  // Filter
  filterRow: { marginBottom: 12 },
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
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1A2E40" },

  // Category tabs
  categoryScroll: { marginBottom: 20 },
  categoryRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  catTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
  },
  catTabActive: {
    backgroundColor: colors.oceanBlue,
    borderColor: colors.oceanBlue,
  },
  catTabText: { fontSize: 13, fontWeight: "500", color: "#4A6880" },
  catTabTextActive: { color: "#fff", fontWeight: "700" },

  // States
  centerBox: { alignItems: "center", marginTop: 60, gap: 12 },
  loadingText: { fontSize: 14, color: "#6B8CA8" },
  emptyBox: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A2E40" },
  emptyDesc: {
    fontSize: 14,
    color: "#6B8CA8",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 20,
  },
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 18 },

  // Place card
  card: {
    width: "31%",
    minWidth: 240,
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8EFF6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardArt: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cardIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardPublicBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.palmGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  cardCatBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  cardCatText: { fontSize: 10, fontWeight: "700" },
  cardBody: { padding: 16, gap: 6 },
  cardName: { fontSize: 15, fontWeight: "700", color: "#1A2E40" },
  cardRatingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardRatingText: { fontSize: 11, color: "#6B8CA8" },
  cardDesc: { fontSize: 13, color: "#6B8CA8", lineHeight: 18 },
  notePreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.oceanBlue,
  },
  notePreviewText: { fontSize: 12, color: "#4A6880" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.oceanBlueLight,
  },
  viewBtnText: { fontSize: 12, fontWeight: "600", color: colors.oceanBlue },
  deleteCardBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FFF1EE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Detail modal
  detailBox: { maxHeight: "85%", padding: 0 },
  detailArt: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "relative",
  },
  detailIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  detailClose: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  publicTag: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: colors.palmGreen,
  },
  publicTagText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  detailContent: { padding: 24, gap: 16 },
  detailTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailName: { fontSize: 22, fontWeight: "700", color: "#1A2E40", marginBottom: 4 },
  detailMetaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  detailMeta: { fontSize: 13, color: "#6B8CA8" },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  catBadgeText: { fontSize: 11, fontWeight: "700" },
  detailRatingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    backgroundColor: "#FFFBF0",
    borderRadius: 12,
  },
  detailRatingText: { fontSize: 13, fontWeight: "600", color: "#92400E" },
  detailSection: { gap: 6 },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B8CA8",
    letterSpacing: 0.5,
  },
  detailSectionText: { fontSize: 14, color: "#4A6880", lineHeight: 20 },
  noteBox: {
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: colors.oceanBlue,
    gap: 6,
  },
  noteTitle: { fontSize: 12, fontWeight: "700", color: colors.oceanBlue },
  noteText: { fontSize: 13, color: "#4A6880", lineHeight: 18 },
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderStyle: "dashed",
  },
  addNoteBtnText: { fontSize: 13, color: colors.oceanBlue, fontWeight: "500" },
  photosSection: { gap: 10 },
  photosGrid: { flexDirection: "row", gap: 10 },
  photoSlot: {
    flex: 1,
    height: 80,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderStyle: "dashed",
  },
  photoSlotText: { fontSize: 10, color: "#A8BECC" },
  photoHint: { fontSize: 11, color: "#A8BECC", textAlign: "center" },
  detailActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  editDetailBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
  },
  editDetailBtnText: { fontSize: 13, fontWeight: "600", color: "#4A6880" },
  directionsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.oceanBlue,
  },
  directionsBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  deleteDetailBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFF1EE",
    alignItems: "center",
    justifyContent: "center",
  },

  // Add/Edit modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
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
    marginBottom: 20,
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
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, fontWeight: "600", color: "#6B8CA8", marginBottom: 8 },
  formInput: {
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 10,
    fontSize: 14,
    color: "#1A2E40",
    backgroundColor: "#fff",
  },
  formTextarea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
  },
  chipActive: {
    borderColor: colors.oceanBlue,
    backgroundColor: colors.oceanBlueLight,
  },
  chipText: { fontSize: 12, color: "#4A6880" },
  chipTextActive: { color: colors.oceanBlue, fontWeight: "700" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  ratingLabel: { fontSize: 13, color: "#6B8CA8" },
  visibilityRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  visBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
  },
  visBtnActive: {
    borderColor: colors.oceanBlue,
    backgroundColor: colors.oceanBlueLight,
  },
  visBtnActivePrivate: {
    borderColor: colors.sunsetCoral,
    backgroundColor: "#FFF1EE",
  },
  visBtnText: { fontSize: 13, fontWeight: "600", color: "#6B8CA8" },
  visBtnTextActive: { color: colors.oceanBlue },
  visBtnTextPrivate: { color: colors.sunsetCoral },
  visHint: { fontSize: 12, color: "#6B8CA8", lineHeight: 16 },
  errorBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFF1EE",
    marginBottom: 8,
  },
  errorText: { fontSize: 13, color: colors.sunsetCoral },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
  },
  cancelText: { fontSize: 13, fontWeight: "600", color: "#4A6880" },
  saveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.oceanBlue,
  },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },
});