import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ArrowLeftRight,
  BookOpen,
  ChevronDown,
  Mic,
  MicOff,
  RefreshCw,
  Search,
  Volume2,
  X,
} from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";
import AIToolHeader from "../components/AIToolHeader";

const LANGUAGES = ["Filipino", "Pangasinan", "English"];

const CATEGORY_COLORS = {
  Greetings: { text: "#22863A", bg: "#EDF7EE" },
  Transport: { text: "#1A5CB0", bg: "#EAF1FB" },
  Food: { text: "#C07000", bg: "#FFF8E1" },
  Accommodation: { text: "#6941C6", bg: "#F5F0FF" },
  Emergency: { text: "#D32F2F", bg: "#FFF0F0" },
  Shopping: { text: "#087F5B", bg: "#E8F8F4" },
};

const SOURCE_BADGE = {
  phrasebook: { label: "✓ Verified", bg: "#EDF7EE", text: "#22863A" },
  "custom-model": { label: "AI Model", bg: colors.oceanBlueLight, text: colors.oceanBlue },
  "ai-model": { label: "AI Model", bg: colors.oceanBlueLight, text: colors.oceanBlue },
  identity: { label: "Same language", bg: "#F4F7FB", text: "#6B8CA8" },
};

// ── Language Pill ───────────────────────────────────────
function LanguagePill({ label, value, onPress }) {
  return (
    <View style={styles.langGroup}>
      <Text style={styles.langLabel}>{label}</Text>
      <Pressable onPress={onPress} style={styles.langPill}>
        <Text style={styles.langPillText}>{value}</Text>
        <ChevronDown size={14} color="#6B8CA8" />
      </Pressable>
    </View>
  );
}

// ── Phrase Card ─────────────────────────────────────────
function PhraseCard({ phrase, from, to, onPress, compact }) {
  const catStyle = CATEGORY_COLORS[phrase.category] ?? {
    text: colors.oceanBlue,
    bg: colors.oceanBlueLight,
  };
  const mainText = phrase[from.toLowerCase()] ?? phrase.filipino ?? "";
  const subText = phrase[to.toLowerCase()] ?? phrase.english ?? "";

  return (
    <Pressable
      onPress={() => onPress(phrase)}
      style={({ pressed }) => [styles.phraseCard, compact && styles.phraseCardMobile, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.phraseCardTop}>
        <View style={[styles.catBadge, { backgroundColor: catStyle.bg }]}>
          <Text style={[styles.catBadgeText, { color: catStyle.text }]}>
            {phrase.category}
          </Text>
        </View>
        <Volume2 size={13} color="#A8BECC" />
      </View>
      <Text style={styles.phraseMain} numberOfLines={2}>{mainText}</Text>
      <Text style={styles.phraseSub} numberOfLines={2}>{subText}</Text>
      <Text style={styles.phraseTap}>Tap to translate →</Text>
    </Pressable>
  );
}

// ── Main Screen ─────────────────────────────────────────
export default function Translator() {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [from, setFrom] = useState("Filipino");
  const [to, setTo] = useState("Pangasinan");
  const [input, setInput] = useState("");
  const [translation, setTranslation] = useState("");
  const [source, setSource] = useState(null);
  const [phrases, setPhrases] = useState([]);
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [phrasesLoading, setPhrasesLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const [recents, setRecents] = useState([]);

  const recorder = useRef(null);
  const chunks = useRef([]);

  const loadPhrases = async () => {
    setPhrasesLoading(true);
    try {
      setPhrases(await api.getPhrasebook());
    } catch (e) {
      setError(e.message || "Could not load phrasebook.");
    } finally {
      setPhrasesLoading(false);
    }
  };

  useEffect(() => { loadPhrases(); }, []);

  const translate = async (text = input, sourceLang = from) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.translate(text.trim(), sourceLang, to);
      setTranslation(r.translation);
      setSource(r.source || "custom-model");
      setRecents((prev) => [
        { phrase: text.trim(), translation: r.translation, pair: `${sourceLang} → ${to}` },
        ...prev.filter((x) => x.phrase !== text.trim()).slice(0, 3),
      ]);
    } catch (e) {
      setError(e.message || "Translation failed.");
    } finally {
      setLoading(false);
    }
  };

  const cycleLanguage = (current, setter) => {
    setter(LANGUAGES[(LANGUAGES.indexOf(current) + 1) % LANGUAGES.length]);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setInput(translation);
    setTranslation(input);
    setSource(null);
  };

  const choosePhrase = (phrase) => {
    const text = phrase[from.toLowerCase()] ?? phrase.filipino ?? "";
    setInput(text);
    translate(text, from);
  };

  const mic = async () => {
    if (
      Platform.OS !== "web" ||
      !navigator?.mediaDevices ||
      !globalThis.MediaRecorder
    ) {
      setError("Voice input is available in the web app. Please use a browser to record speech.");
      return;
    }
    if (listening) {
      recorder.current?.stop();
      setListening(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const active = new MediaRecorder(stream, { mimeType: type });
      recorder.current = active;
      chunks.current = [];
      active.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      active.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type });
        if (blob.size < 1000) { setError("Recording was too short. Please try again."); return; }
        setTranscribing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const result = await api.transcribe(String(reader.result).split(",")[1], type);
            setInput(result.text);
            await translate(result.text);
          } catch (e) {
            setError(e.message || "Unable to transcribe recording.");
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };
      active.start();
      setListening(true);
      setError(null);
    } catch {
      setError("Microphone access was not granted. Check browser permissions.");
    }
  };

  const speak = async () => {
    if (!translation || speaking) return;
    setSpeaking(true);
    try {
      const r = await api.speech(translation, to);
      if (Platform.OS !== "web") throw new Error("Audio playback is available in the web app.");
      const audio = new Audio(`data:${r.mime_type || "audio/wav"};base64,${r.audio}`);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => { setSpeaking(false); setError("Audio could not be played."); };
      await audio.play();
    } catch (e) {
      setSpeaking(false);
      setError(e.message || "Unable to create speech.");
    }
  };

  const categories = ["All", ...new Set(phrases.map((p) => p.category))];
  const visible = phrases.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      Object.values(p).some((v) =>
        String(v).toLowerCase().includes(query.toLowerCase())
      )
  );

  const sourceBadge = source ? SOURCE_BADGE[source] ?? SOURCE_BADGE["ai-model"] : null;
  const phraseCards = <View style={[styles.phraseGrid, mobile && styles.phraseGridMobile]}>{visible.map((phrase) => <PhraseCard key={phrase._id ?? phrase.id} phrase={phrase} from={from} to={to} onPress={choosePhrase} compact={mobile} />)}</View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.screen, mobile && styles.screenMobile]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero Banner ── */}
      <AIToolHeader compact={mobile} eyebrow="PANGASINAN LANGUAGE COMPANION" title="Translator & Phrasebook" subtitle="Speak, translate, and listen with verified local phrases and your own AI model." badges={[{ label: "MongoDB-verified phrases" }, { label: "Custom AI model" }, { label: "Voice transcription", color: "#A78BFA" }]} Icon={BookOpen} />

      <View style={[styles.body, mobile && styles.bodyMobile]}>
        {/* ── Left: Translator ── */}
        <View style={[styles.leftCol, mobile && styles.leftColMobile]}>
          <View style={[styles.card, mobile && styles.cardMobile]}>
            <Text style={styles.cardTitle}>Translate a Phrase</Text>

            {/* Language row */}
            <View style={styles.langRow}>
              <LanguagePill
                label="From"
                value={from}
                onPress={() => cycleLanguage(from, setFrom)}
              />
              <Pressable onPress={swap} style={styles.swapBtn}>
                <ArrowLeftRight size={16} color={colors.oceanBlue} />
              </Pressable>
              <LanguagePill
                label="To"
                value={to}
                onPress={() => cycleLanguage(to, setTo)}
              />
            </View>

            {/* Input */}
            <View style={[styles.inputWrapper, listening && styles.inputWrapperActive]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                multiline
                placeholder={
                  listening
                    ? "🎙 Recording — tap the mic to stop..."
                    : `Type in ${from}...`
                }
                placeholderTextColor="#A8BECC"
                style={styles.textArea}
                onSubmitEditing={() => translate()}
              />
              <Pressable
                onPress={mic}
                disabled={transcribing}
                style={[
                  styles.micBtn,
                  listening && styles.micBtnActive,
                  transcribing && styles.micBtnTranscribing,
                ]}
              >
                {transcribing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : listening ? (
                  <MicOff size={16} color="#fff" />
                ) : (
                  <Mic size={16} color="#fff" />
                )}
              </Pressable>
            </View>

            {/* Status banners */}
            {listening && (
              <View style={styles.bannerRecording}>
                <View style={styles.recordingDot} />
                <Text style={styles.bannerText}>
                  Recording... tap the mic button to stop
                </Text>
              </View>
            )}
            {transcribing && (
              <View style={styles.bannerTranscribing}>
                <ActivityIndicator size="small" color="#C07000" style={{ marginRight: 8 }} />
                <Text style={[styles.bannerText, { color: "#C07000" }]}>
                  Transcribing with Groq Whisper...
                </Text>
              </View>
            )}

            {/* Translate button */}
            <Pressable
              onPress={() => translate()}
              disabled={loading || !input.trim()}
              style={[
                styles.translateBtn,
                (loading || !input.trim()) && styles.translateBtnDisabled,
              ]}
            >
              {loading && (
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
              )}
              <Text style={styles.translateBtnText}>
                {loading ? "Translating..." : "Translate"}
              </Text>
            </Pressable>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={() => setError(null)}>
                  <X size={14} color="#B44428" />
                </Pressable>
              </View>
            )}

            {/* Translation output */}
            <View style={styles.outputBox}>
              <View style={styles.outputHeader}>
                <Text style={styles.outputLabel}>{to} translation</Text>
                {sourceBadge && (
                  <View style={[styles.sourceBadge, { backgroundColor: sourceBadge.bg }]}>
                    <Text style={[styles.sourceBadgeText, { color: sourceBadge.text }]}>
                      {sourceBadge.label}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.outputRow}>
                <Text
                  style={[
                    styles.outputText,
                    !translation && styles.outputPlaceholder,
                  ]}
                >
                  {translation || "Your translation will appear here..."}
                </Text>
                {translation && (
                  <Pressable onPress={speak} style={styles.speakBtn}>
                    {speaking ? (
                      <ActivityIndicator size="small" color={colors.oceanBlue} />
                    ) : (
                      <Volume2 size={18} color={colors.oceanBlue} />
                    )}
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {/* Recent translations */}
          {recents.length > 0 && (
            <View style={[styles.card, mobile && styles.cardMobile]}>
              <Text style={styles.cardTitle}>Recent Translations</Text>
              {recents.map((item, i) => (
                <Pressable
                  key={`${item.phrase}-${i}`}
                  onPress={() => {
                    setInput(item.phrase);
                    setTranslation(item.translation);
                  }}
                  style={[
                    styles.recentRow,
                    i < recents.length - 1 && styles.recentBorder,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentPhrase}>{item.phrase}</Text>
                    <Text style={styles.recentTranslation}>
                      → {item.translation}
                    </Text>
                  </View>
                  <View style={styles.pairBadge}>
                    <Text style={styles.pairBadgeText}>{item.pair}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* ── Right: Phrasebook ── */}
        <View style={[styles.rightCol, mobile && styles.rightColMobile]}>
          <View style={[styles.card, mobile && styles.cardMobile]}>
            {/* Header */}
            <View style={styles.phraseHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Phrasebook</Text>
                <Text style={styles.phraseSub2}>
                  Live from MongoDB · {phrases.length} phrases
                </Text>
              </View>
              <Pressable onPress={loadPhrases} style={styles.refreshBtn}>
                <RefreshCw size={14} color={colors.oceanBlue} />
                <Text style={styles.refreshText}>Refresh</Text>
              </Pressable>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Search size={14} color="#6B8CA8" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search phrases..."
                placeholderTextColor="#A8BECC"
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")}>
                  <X size={13} color="#6B8CA8" />
                </Pressable>
              )}
            </View>

            {/* Category tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catTabs}
            >
              {categories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.catTab, category === cat && styles.catTabActive]}
                >
                  <Text
                    style={[
                      styles.catTabText,
                      category === cat && styles.catTabTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Phrase cards */}
            {phrasesLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.oceanBlue} />
                <Text style={styles.loadingText}>Loading phrases from MongoDB...</Text>
              </View>
            ) : visible.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No phrases match your search.</Text>
              </View>
            ) : (
              mobile ? <ScrollView style={styles.phraseResultsMobile} nestedScrollEnabled showsVerticalScrollIndicator>{phraseCards}</ScrollView> : phraseCards
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F8FA" },
  screen: {
    padding: 28,
    paddingBottom: 48,
    maxWidth: 1320,
    width: "100%",
    alignSelf: "center",
  },
  screenMobile: { padding: 16, paddingBottom: 28 },

  // Hero
  hero: {
    backgroundColor: "#0B3C5D",
    borderRadius: 20,
    padding: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  heroContent: { flex: 1, paddingRight: 20 },
  heroEyebrow: {
    color: "#7BB8D4",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "#A8CCE0",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 560,
    marginBottom: 16,
  },
  heroBadgeRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  heroBadgeText: { color: "#C8E1EE", fontSize: 12, fontWeight: "600" },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Layout
  body: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  bodyMobile: { flexDirection: "column", gap: 16 },
  leftCol: { flex: 1, gap: 20 },
  leftColMobile: { width: "100%", gap: 16 },
  rightCol: { width: 380, flexShrink: 0 },
  rightColMobile: { width: "100%" },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    shadowColor: "#173B50",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
    gap: 0,
  },
  cardMobile: { padding: 16, borderRadius: 15 },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#183447",
    marginBottom: 18,
  },

  // Language selector
  langRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 16,
  },
  langGroup: { flex: 1 },
  langLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B8CA8",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  langPill: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D9E7EE",
    borderRadius: 10,
    padding: 11,
  },
  langPillText: { fontSize: 14, fontWeight: "700", color: "#183447" },
  swapBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.oceanBlueLight,
    marginBottom: 2,
    flexShrink: 0,
  },

  // Input
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: "#D9E7EE",
    borderRadius: 13,
    marginBottom: 12,
    position: "relative",
  },
  inputWrapperActive: { borderColor: colors.sunsetCoral },
  textArea: {
    minHeight: 120,
    padding: 15,
    paddingRight: 56,
    fontSize: 14,
    color: "#183447",
    textAlignVertical: "top",
  },
  micBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.oceanBlue,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  micBtnActive: { backgroundColor: colors.sunsetCoral },
  micBtnTranscribing: { backgroundColor: "#C07000" },

  // Banners
  bannerRecording: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0EC",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  bannerTranscribing: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sunsetCoral,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B44428",
  },

  // Translate button
  translateBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.oceanBlue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  translateBtnDisabled: { backgroundColor: "#AABDC8" },
  translateBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  // Error
  errorBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#FFF0EC",
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: "#B44428", flex: 1 },

  // Output
  outputBox: {
    borderRadius: 13,
    backgroundColor: "#F4FAFC",
    padding: 16,
    borderWidth: 1,
    borderColor: "#DCE9F0",
  },
  outputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  outputLabel: { fontSize: 11, fontWeight: "700", color: "#537185", letterSpacing: 0.5 },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: "700" },
  outputRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  outputText: { flex: 1, fontSize: 18, fontWeight: "700", color: "#183447", lineHeight: 26 },
  outputPlaceholder: { color: "#8DA3B1", fontStyle: "italic", fontWeight: "400", fontSize: 15 },
  speakBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.oceanBlueLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Recent
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  recentBorder: { borderBottomWidth: 1, borderBottomColor: "#EEF3F5" },
  recentPhrase: { fontSize: 14, fontWeight: "600", color: "#183447", marginBottom: 2 },
  recentTranslation: { fontSize: 13, color: "#6B8CA8" },
  pairBadge: {
    backgroundColor: "#EDF3F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    flexShrink: 0,
  },
  pairBadgeText: { fontSize: 11, fontWeight: "700", color: "#527084" },

  // Phrasebook
  phraseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  phraseSub2: { fontSize: 12, color: "#6B8CA8", marginTop: 3 },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.oceanBlueLight,
  },
  refreshText: { fontSize: 12, fontWeight: "700", color: colors.oceanBlue },

  // Search
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: "#D9E7EE",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 13, color: "#183447" },

  // Category tabs
  catTabs: { flexDirection: "row", gap: 6, paddingBottom: 16 },
  catTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#EDF3F6",
  },
  catTabActive: { backgroundColor: colors.oceanBlue },
  catTabText: { fontSize: 12, fontWeight: "700", color: "#527084" },
  catTabTextActive: { color: "#fff" },

  // States
  loadingBox: { alignItems: "center", paddingVertical: 40, gap: 10 },
  loadingText: { fontSize: 13, color: "#6B8CA8" },
  emptyBox: { alignItems: "center", paddingVertical: 32 },
  emptyText: { fontSize: 13, color: "#6B8CA8" },

  // Phrase grid
  phraseGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  phraseGridMobile: { flexDirection: "column", gap: 8, paddingRight: 4 },
  phraseResultsMobile: { maxHeight: 330 },
  phraseCard: {
    width: "48%",
    minWidth: 160,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E2ECEF",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#FCFEFF",
    gap: 6,
  },
  phraseCardMobile: { width: "100%", minWidth: 0, padding: 12 },
  phraseCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  catBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  phraseMain: { fontSize: 14, fontWeight: "800", color: "#183447", lineHeight: 20 },
  phraseSub: { fontSize: 13, color: "#527084", lineHeight: 18 },
  phraseTap: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.oceanBlue,
    marginTop: 6,
  },
});
