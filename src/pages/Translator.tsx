import { useState } from "react";
import { Mic, ArrowLeftRight, Wifi } from "lucide-react";
import { colors } from "../theme/colors";

const languages = ["Filipino", "Pangasinan", "Ilocano", "English"];

type PhraseCategory = "All" | "Greetings" | "Transport" | "Food" | "Emergency";

const phrasebook: {
  phrase: string;
  translation: string;
  category: Exclude<PhraseCategory, "All">;
}[] = [
  { phrase: "Magandang umaga", translation: "Maung ya bigla", category: "Greetings" },
  { phrase: "Saan ang terminal?", translation: "Iner so terminal?", category: "Transport" },
  { phrase: "Magkano ang pamasahe?", translation: "Magkano so pamasahe?", category: "Transport" },
  { phrase: "Tulong po!", translation: "Abigan mo ak!", category: "Emergency" },
  { phrase: "Nasaan ang ospital?", translation: "Iner so ospital?", category: "Emergency" },
  { phrase: "Masarap na pagkain", translation: "Masamit so tinapay", category: "Food" },
];

const recentTranslations = [
  { phrase: "Saan ang banyo?", translation: "Iner so banyo?", pair: "Fil → Pan" },
  { phrase: "How much is this?", translation: "Magkano ito?", pair: "Eng → Fil" },
  { phrase: "Maung ya arko", translation: "Magandang hapon", pair: "Pan → Fil" },
  { phrase: "Kumain na kayo?", translation: "Have you eaten?", pair: "Fil → Eng" },
];

const offlinePacks = [
  { lang: "Pangasinan", size: "12 MB", downloaded: true },
  { lang: "Filipino", size: "8 MB", downloaded: true },
  { lang: "Ilocano", size: "9 MB", downloaded: false },
];

const categoryColors: Record<Exclude<PhraseCategory, "All">, { bg: string; color: string }> = {
  Greetings: { bg: "#EDF7EE", color: "#22863A" },
  Transport: { bg: "#EAF1FB", color: "#1A5CB0" },
  Food: { bg: "#FFF8E1", color: "#C07000" },
  Emergency: { bg: "#FFF0F0", color: "#D32F2F" },
};

export default function Translator() {
  const [fromLang, setFromLang] = useState("Filipino");
  const [toLang, setToLang] = useState("Pangasinan");
  const [inputText, setInputText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [activeCategory, setActiveCategory] = useState<PhraseCategory>("All");
  const [isListening, setIsListening] = useState(false);

  const handleSwapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setInputText(translatedText);
    setTranslatedText(inputText);
  };

  const filteredPhrases =
    activeCategory === "All"
      ? phrasebook
      : phrasebook.filter((p) => p.category === activeCategory);

  const categories: PhraseCategory[] = ["All", "Greetings", "Transport", "Food", "Emergency"];

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: "#F7F9FB",
        overflowY: "auto",
        padding: "32px 40px",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            fontSize: 26,
            color: "#1A2E40",
            margin: "0 0 4px 0",
          }}
        >
          Voice Translator
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: "#6B8CA8" }}>
          Real-time Filipino ↔ Pangasinan ↔ English · Offline-capable
        </p>
      </div>

      {/* Two-column body */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Left column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Translator card */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            {/* Language selectors */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6B8CA8", marginBottom: 6 }}>
                  From
                </label>
                <select
                  value={fromLang}
                  onChange={(e) => setFromLang(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #E2EBF3",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1A2E40",
                    backgroundColor: "#fff",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {languages.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>

              {/* Swap button */}
              <button
                onClick={handleSwapLanguages}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  border: "1.5px solid #E2EBF3",
                  backgroundColor: "#fff",
                  color: "#4A6880",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 22,
                }}
              >
                <ArrowLeftRight size={16} />
              </button>

              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, color: "#6B8CA8", marginBottom: 6 }}>
                  To
                </label>
                <select
                  value={toLang}
                  onChange={(e) => setToLang(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: 10,
                    border: "1.5px solid #E2EBF3",
                    fontSize: 14,
                    fontFamily: "'DM Sans', sans-serif",
                    color: "#1A2E40",
                    backgroundColor: "#fff",
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  {languages.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Input area */}
            <div
              style={{
                borderRadius: 12,
                border: "1.5px solid #E2EBF3",
                marginBottom: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Type in ${fromLang}...`}
                rows={4}
                style={{
                  width: "100%",
                  padding: "16px 50px 16px 16px",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1A2E40",
                  resize: "none",
                  boxSizing: "border-box",
                  backgroundColor: "#fff",
                }}
              />
              {/* Mic button */}
              <button
                onClick={() => setIsListening((v) => !v)}
                style={{
                  position: "absolute",
                  bottom: 14,
                  right: 14,
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: isListening ? colors.sunsetCoral : colors.oceanBlue,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}
              >
                <Mic size={16} />
              </button>
            </div>

            {/* Translation output */}
            <div
              style={{
                borderRadius: 12,
                border: "1.5px solid #E2EBF3",
                padding: "16px",
                minHeight: 80,
                backgroundColor: "#FAFCFD",
              }}
            >
              <div style={{ fontSize: 12, color: "#6B8CA8", marginBottom: 8, fontWeight: 500 }}>
                {toLang} translation
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: translatedText ? "#1A2E40" : "#A8BECC",
                  fontStyle: translatedText ? "normal" : "italic",
                }}
              >
                {translatedText || "Translation will appear here..."}
              </div>
            </div>
          </div>

          {/* Recent Translations */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "#1A2E40",
                margin: "0 0 16px 0",
              }}
            >
              Recent Translations
            </h3>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentTranslations.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 0",
                    borderBottom:
                      i < recentTranslations.length - 1 ? "1px solid #F0F5FA" : "none",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#1A2E40", marginBottom: 3 }}>
                      {item.phrase}
                    </div>
                    <div style={{ fontSize: 12, color: "#6B8CA8" }}>→ {item.translation}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#4A6880",
                      backgroundColor: "#F0F5FA",
                      borderRadius: 6,
                      padding: "3px 10px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      marginLeft: 16,
                    }}
                  >
                    {item.pair}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Phrasebook card */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <h3
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 15,
                color: "#1A2E40",
                margin: "0 0 14px 0",
              }}
            >
              Phrasebook
            </h3>

            {/* Category tabs */}
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: "none",
                    backgroundColor:
                      activeCategory === cat ? colors.oceanBlue : "#F0F5FA",
                    color: activeCategory === cat ? "#fff" : "#4A6880",
                    fontSize: 12,
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: activeCategory === cat ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Phrases list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
              {filteredPhrases.map((item, i) => {
                const colors2 = categoryColors[item.category];
                return (
                  <div
                    key={i}
                    style={{
                      padding: "12px 0",
                      borderBottom:
                        i < filteredPhrases.length - 1 ? "1px solid #F0F5FA" : "none",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1A2E40",
                          marginBottom: 2,
                        }}
                      >
                        {item.phrase}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B8CA8" }}>{item.translation}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: colors2.color,
                        backgroundColor: colors2.bg,
                        borderRadius: 6,
                        padding: "2px 8px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Offline packs card */}
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 22,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <Wifi size={15} color="#6B8CA8" />
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#1A2E40",
                }}
              >
                Offline packs downloaded
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {offlinePacks.map((pack, i) => (
                <div
                  key={pack.lang}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom:
                      i < offlinePacks.length - 1 ? "1px solid #F0F5FA" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: pack.downloaded ? "#22C55E" : "#D1DCE5",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: "#1A2E40" }}>{pack.lang}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#6B8CA8" }}>{pack.size}</span>
                    {!pack.downloaded && (
                      <button
                        style={{
                          padding: "4px 12px",
                          borderRadius: 8,
                          border: "1.5px solid #E2EBF3",
                          backgroundColor: "#fff",
                          color: colors.sunsetCoral,
                          fontSize: 12,
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Get
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}