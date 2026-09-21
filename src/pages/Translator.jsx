import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowLeftRight, Mic, MicOff, Wifi } from "lucide-react-native";
import { api } from "../lib/api";
import { colors } from "../theme/colors";

const languages = ["Filipino", "Pangasinan", "English"];

const phrases = [
  { phrase: "Magandang umaga", translation: "Masantos a kabwasan", category: "Greetings" },
  { phrase: "Kumusta ka?", translation: "Kumusta ka la? / Antoy emano?", category: "Greetings" },
  { phrase: "Maraming salamat", translation: "Balbaleg ya salamat", category: "Greetings" },
  { phrase: "Nasaan ang terminal ng bus?", translation: "Iner so istasyon na bus?", category: "Transport" },
  { phrase: "Magkano ang tiket papunta sa ___?", translation: "Sampigay tiket ed ___?", category: "Transport" },
  { phrase: "Paano ako makakarating sa ___?", translation: "Panon ak ya makarkar ed ___?", category: "Transport" },
  { phrase: "Kain na tayo!", translation: "Mangan tila!", category: "Food" },
  { phrase: "Nasaan ang banyo?", translation: "Iner so banyo / CR? / Kawalaan na patiang?", category: "Food" },
  { phrase: "Patingnan mo ang menu", translation: "Sarag ton nengnengen ko so minu?", category: "Food" },
  { phrase: "May bakanteng kwarto kayo?", translation: "Walay silid yo ya malaem?", category: "Accommodation" },
  { phrase: "Magkano ang isang kwarto?", translation: "Sampigay silid kada sakey to-o?", category: "Accommodation" },
  { phrase: "Gusto ko nang mag-check out", translation: "Labay ko lay ompaway", category: "Accommodation" },
  { phrase: "Tulong!", translation: "Tabang!", category: "Emergency" },
  { phrase: "Kailangan ko ng doktor", translation: "Kaukolan koy doktor", category: "Emergency" },
  { phrase: "Nawawala ako", translation: "Abalang ak", category: "Emergency" },
  { phrase: "Magkano ito?", translation: "Sampiga ya? / Sampiga iya?", category: "Shopping" },
  { phrase: "Pwede bang magpababa ng presyo?", translation: "Kasi pakulangan?", category: "Shopping" },
  { phrase: "May pasalubong ba kayo?", translation: "Wala ray pasalubong yo dia?", category: "Shopping" },
];

const phraseCategories = ["All", ...new Set(phrases.map((phrase) => phrase.category))];

const categoryColors = {
  Greetings: { bg: "#EDF7EE", color: "#22863A" },
  Transport: { bg: "#EAF1FB", color: "#1A5CB0" },
  Food: { bg: "#FFF8E1", color: "#C07000" },
  Accommodation: { bg: "#F3EEFF", color: "#6941C6" },
  Emergency: { bg: "#FFF0F0", color: "#D32F2F" },
  Shopping: { bg: "#E8F8F5", color: "#087F5B" },
};

const offlinePacks = [
  { lang: "Pangasinan", size: "12 MB", downloaded: true },
  { lang: "Filipino", size: "8 MB", downloaded: true },
  { lang: "Ilocano", size: "9 MB", downloaded: false },
];

export default function Translator() {
  const [from, setFrom] = useState("Filipino");
  const [to, setTo] = useState("Pangasinan");
  const [input, setInput] = useState("");
  const [translation, setTranslation] = useState("");
  const [source, setSource] = useState(null);
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState(null);
  const [recents, setRecents] = useState([]);
  const recorder = useRef(null);
  const chunks = useRef([]);

  const translate = async (text = input) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.translate(text, from, to);
      setTranslation(result.translation);
      setSource(result.source || "ai");
      setRecents((current) => [
        {
          phrase: text,
          translation: result.translation,
          pair: `${from.slice(0, 3)} → ${to.slice(0, 3)}`,
        },
        ...current.slice(0, 3),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Translation failed.");
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setInput(translation);
    setTranslation(input);
  };

  const cycleLanguage = (current, setter) => {
    const next = languages[(languages.indexOf(current) + 1) % languages.length];
    setter(next);
  };

  const mic = async () => {
    if (
      Platform.OS !== "web" ||
      !globalThis.navigator?.mediaDevices ||
      !globalThis.MediaRecorder
    ) {
      setError("Voice input is available in the web version only.");
      return;
    }

    if (listening) {
      recorder.current?.stop();
      setListening(false);
      return;
    }

    try {
      const stream = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = globalThis.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const current = new globalThis.MediaRecorder(stream, { mimeType });
      recorder.current = current;
      chunks.current = [];

      current.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };

      current.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunks.current, { type: mimeType });
        if (blob.size < 1000) {
          setError("Recording too short. Please speak clearly and try again.");
          return;
        }
        setTranscribing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = String(reader.result).split(",")[1];
            const result = await api.transcribe(base64, mimeType);
            const transcribed = result.text || "";
            setInput(transcribed);
            await translate(transcribed);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Unable to transcribe recording.");
          } finally {
            setTranscribing(false);
          }
        };
        reader.readAsDataURL(blob);
      };

      current.start();
      setListening(true);
      setError(null);
    } catch {
      setError("Microphone access was not granted.");
    }
  };

  const usePhrase = (phrase) => {
    setInput(phrase);
    translate(phrase);
  };

  const visiblePhrases =
    category === "All" ? phrases : phrases.filter((p) => p.category === category);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Voice Translator</Text>
        <Text style={styles.subtitle}>
          Real-time Filipino ↔ Pangasinan ↔ English · Phrasebook-verified
        </Text>
      </View>

      <View style={styles.columns}>
        {/* Left Column */}
        <View style={styles.leftCol}>

          {/* Translator Card */}
          <View style={styles.card}>
            {/* Language Selectors */}
            <View style={styles.langRow}>
              <View style={styles.langBox}>
                <Text style={styles.langLabel}>From</Text>
                <Pressable
                  onPress={() => cycleLanguage(from, setFrom)}
                  style={styles.langPill}
                >
                  <Text style={styles.langPillText}>{from}</Text>
                </Pressable>
              </View>

              <Pressable onPress={swap} style={styles.swapBtn}>
                <ArrowLeftRight size={16} color="#4A6880" />
              </Pressable>

              <View style={styles.langBox}>
                <Text style={styles.langLabel}>To</Text>
                <Pressable
                  onPress={() => cycleLanguage(to, setTo)}
                  style={styles.langPill}
                >
                  <Text style={styles.langPillText}>{to}</Text>
                </Pressable>
              </View>
            </View>

            {/* Input Area */}
            <View style={[styles.inputWrapper, listening && styles.inputWrapperActive]}>
              <TextInput
                value={input}
                onChangeText={setInput}
                multiline
                placeholder={
                  listening
                    ? "🎙 Recording... tap mic to stop"
                    : transcribing
                    ? "Transcribing your speech..."
                    : `Type in ${from} and press Translate...`
                }
                placeholderTextColor="#A8BECC"
                style={styles.textArea}
              />
              {/* Mic Button */}
              <Pressable
                onPress={mic}
                disabled={transcribing}
                style={[
                  styles.micBtn,
                  listening && styles.micBtnListening,
                  transcribing && styles.micBtnTranscribing,
                ]}
              >
                {transcribing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : listening ? (
                  <MicOff size={16} color="#fff" />
                ) : (
                  <Mic size={16} color="#fff" />
                )}
              </Pressable>
            </View>

            {/* Listening indicator */}
            {listening && (
              <View style={styles.listeningBanner}>
                <View style={styles.listeningDot} />
                <Text style={styles.listeningText}>
                  Recording... tap the mic button to stop
                </Text>
              </View>
            )}

            {transcribing && (
              <View style={styles.transcribingBanner}>
                <ActivityIndicator size="small" color={colors.gold} />
                <Text style={styles.transcribingText}>
                  Transcribing with Groq Whisper...
                </Text>
              </View>
            )}

            {/* Translate Button */}
            <Pressable
              onPress={() => translate()}
              disabled={loading || !input.trim()}
              style={[
                styles.translateBtn,
                (loading || !input.trim()) && styles.translateBtnDisabled,
              ]}
            >
              {loading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />}
              <Text style={styles.translateBtnText}>
                {loading ? "Translating..." : "Translate"}
              </Text>
            </Pressable>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Translation Output */}
            <View style={styles.outputBox}>
              <View style={styles.outputHeader}>
                <Text style={styles.outputLabel}>{to} translation</Text>
                {source && (
                  <View
                    style={[
                      styles.sourceBadge,
                      source === "phrasebook"
                        ? styles.sourceBadgeVerified
                        : styles.sourceBadgeAI,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sourceBadgeText,
                        source === "phrasebook"
                          ? styles.sourceBadgeTextVerified
                          : styles.sourceBadgeTextAI,
                      ]}
                    >
                      {source === "phrasebook" ? "✓ Verified" : "AI Generated"}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.outputText, !translation && styles.outputPlaceholder]}>
                {translation || "Translation will appear here..."}
              </Text>
            </View>
          </View>

          {/* Recent Translations */}
          {recents.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recent Translations</Text>
              {recents.map((item, i) => (
                <View
                  key={`${item.phrase}-${i}`}
                  style={[
                    styles.recentRow,
                    i < recents.length - 1 && styles.recentBorder,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recentPhrase}>{item.phrase}</Text>
                    <Text style={styles.recentTranslation}>→ {item.translation}</Text>
                  </View>
                  <View style={styles.pairBadge}>
                    <Text style={styles.pairBadgeText}>{item.pair}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Right Column */}
        <View style={styles.rightCol}>

          {/* Phrasebook */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Phrasebook</Text>

            {/* Category tabs */}
            <View style={styles.categoryRow}>
              {phraseCategories.map((cat) => (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.catPill,
                    category === cat && styles.catPillActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      category === cat && styles.catPillTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Phrases */}
            {visiblePhrases.map((item, i) => {
              const c = categoryColors[item.category] || categoryColors.Greetings;
              return (
                <Pressable
                  key={item.phrase}
                  onPress={() => usePhrase(item.phrase)}
                  style={[
                    styles.phraseRow,
                    i < visiblePhrases.length - 1 && styles.phraseBorder,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.phraseText}>{item.phrase}</Text>
                    <Text style={styles.phraseTranslation}>{item.translation}</Text>
                  </View>
                  <View style={[styles.phraseCatBadge, { backgroundColor: c.bg }]}>
                    <Text style={[styles.phraseCatText, { color: c.color }]}>
                      {item.category}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Offline Packs */}
          <View style={styles.card}>
            <View style={styles.offlineHeader}>
              <Wifi size={15} color="#6B8CA8" />
              <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 8 }]}>
                Offline packs
              </Text>
            </View>
            <View style={{ marginTop: 14 }}>
              {offlinePacks.map((pack, i) => (
                <View
                  key={pack.lang}
                  style={[
                    styles.packRow,
                    i < offlinePacks.length - 1 && styles.packBorder,
                  ]}
                >
                  <View style={styles.packLeft}>
                    <View
                      style={[
                        styles.packDot,
                        {
                          backgroundColor: pack.downloaded
                            ? "#22C55E"
                            : "#D1DCE5",
                        },
                      ]}
                    />
                    <Text style={styles.packName}>{pack.lang}</Text>
                  </View>
                  <View style={styles.packRight}>
                    <Text style={styles.packSize}>{pack.size}</Text>
                    {!pack.downloaded && (
                      <Pressable style={styles.getBtn}>
                        <Text style={styles.getBtnText}>Get</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F9FB",
  },
  screen: {
    flexGrow: 1,
    padding: 32,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1A2E40",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B8CA8",
  },
  columns: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
  },
  leftCol: {
    flex: 1,
    gap: 20,
  },
  rightCol: {
    width: 300,
    gap: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A2E40",
    marginBottom: 14,
  },

  // Language selectors
  langRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 20,
  },
  langBox: {
    flex: 1,
  },
  langLabel: {
    fontSize: 12,
    color: "#6B8CA8",
    marginBottom: 6,
  },
  langPill: {
    width: "100%",
    padding: 11,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 10,
    alignItems: "center",
  },
  langPillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A2E40",
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },

  // Input
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 12,
    marginBottom: 16,
    position: "relative",
  },
  inputWrapperActive: {
    borderColor: colors.sunsetCoral,
  },
  textArea: {
    minHeight: 120,
    padding: 16,
    paddingRight: 52,
    fontSize: 14,
    color: "#1A2E40",
    textAlignVertical: "top",
  },
  micBtn: {
    position: "absolute",
    bottom: 12,
    right: 12,
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
  micBtnListening: {
    backgroundColor: colors.sunsetCoral,
  },
  micBtnTranscribing: {
    backgroundColor: colors.gold,
  },

  // Banners
  listeningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF1EE",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.sunsetCoral,
  },
  listeningText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.sunsetCoral,
  },
  transcribingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  transcribingText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.gold,
  },

  // Translate button
  translateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 13,
    borderRadius: 10,
    backgroundColor: colors.oceanBlue,
    marginBottom: 16,
  },
  translateBtnDisabled: {
    backgroundColor: "#CBD5E0",
  },
  translateBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },

  // Error
  errorBox: {
    backgroundColor: "#FFF1EE",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: colors.sunsetCoral,
  },

  // Output
  outputBox: {
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 12,
    padding: 16,
    minHeight: 80,
    backgroundColor: "#FAFCFD",
  },
  outputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  outputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B8CA8",
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  sourceBadgeVerified: {
    backgroundColor: colors.palmGreenLight,
  },
  sourceBadgeAI: {
    backgroundColor: colors.oceanBlueLight,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sourceBadgeTextVerified: {
    color: colors.palmGreen,
  },
  sourceBadgeTextAI: {
    color: colors.oceanBlue,
  },
  outputText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1A2E40",
  },
  outputPlaceholder: {
    color: "#A8BECC",
    fontStyle: "italic",
    fontWeight: "400",
  },

  // Recents
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },
  recentBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F5FA",
  },
  recentPhrase: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A2E40",
    marginBottom: 3,
  },
  recentTranslation: {
    fontSize: 12,
    color: "#6B8CA8",
  },
  pairBadge: {
    backgroundColor: "#F0F5FA",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pairBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4A6880",
  },

  // Phrasebook
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#F0F5FA",
  },
  catPillActive: {
    backgroundColor: colors.oceanBlue,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4A6880",
  },
  catPillTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  phraseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
  },
  phraseBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F5FA",
  },
  phraseText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A2E40",
    marginBottom: 2,
  },
  phraseTranslation: {
    fontSize: 12,
    color: "#6B8CA8",
  },
  phraseCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    flexShrink: 0,
  },
  phraseCatText: {
    fontSize: 10,
    fontWeight: "700",
  },

  // Offline packs
  offlineHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  packRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  packBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F5FA",
  },
  packLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  packDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  packName: {
    fontSize: 13,
    color: "#1A2E40",
  },
  packRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  packSize: {
    fontSize: 12,
    color: "#6B8CA8",
  },
  getBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: "#E2EBF3",
    borderRadius: 8,
  },
  getBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.sunsetCoral,
  },
});
