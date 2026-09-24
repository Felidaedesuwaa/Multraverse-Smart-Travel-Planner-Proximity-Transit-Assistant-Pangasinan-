import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Compass, MapPin, Pause, Play } from "lucide-react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

// Local vector artwork stays crisp and works without an image download.
export default function SummerScene({ compact = false }) {
  const focused = useIsFocused();
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduced(value); }).catch(() => {});
    const motion = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    const app = AppState.addEventListener("change", state => setActive(state === "active"));
    return () => { mounted = false; motion?.remove(); app.remove(); };
  }, []);
  const playing = focused && active && !paused && !reduced;
  useEffect(() => {
    if (!playing) { drift.setValue(0); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      Animated.timing(drift, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [drift, playing]);

  return <View style={[styles.scene, compact && styles.compact]} testID="summer-scene">
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={compact ? "0 40 600 300" : "0 0 600 510"} preserveAspectRatio="xMidYMid slice">
        <Rect width="600" height="510" fill="#DBEFE9" />
        <Circle cx="446" cy="112" r="65" fill="#F9D27E" />
        <Circle cx="446" cy="112" r="83" fill="none" stroke="#F5DEA9" strokeWidth="1" />
        <Path d="M-20 235 Q145 208 310 236 T620 226 V510 H-20Z" fill="#72BDBB" />
        <Path d="M-20 272 Q145 242 280 282 T620 265 V510 H-20Z" fill="#3F929B" />
        <Path d="M-20 321 Q140 296 280 330 T620 318 V510 H-20Z" fill="#237384" />
        <G fill="#F7FFFA" opacity="0.65">
          <Path d="M50 92 Q55 77 71 83 Q81 61 103 83 Q118 77 123 92Z" />
          <Path d="M240 132 Q251 113 268 126 Q282 96 302 125 Q325 119 329 132Z" />
        </G>
        <G stroke="#356963" strokeWidth="2">
          <Path d="M41 242 Q53 216 69 216 Q67 169 111 177 Q142 136 169 183 Q191 189 201 239Z" fill="#619575" />
          <Path d="M85 236 Q91 190 118 195 Q155 165 174 239Z" fill="#81AA82" stroke="none" />
          <Path d="M218 253 Q228 212 254 224 Q267 179 295 218 Q323 206 338 249Z" fill="#7FAE87" />
          <Path d="M385 236 Q394 214 420 218 Q431 186 460 207 Q489 209 501 237Z" fill="#517F6A" />
        </G>
        <Path d="M73 251 H160 M245 262 H310 M406 245 H490 M334 300 H380 M54 295 H105 M145 332 H180 M450 303 H534" stroke="#B0DBD1" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
        <G transform="translate(441 165)">
          <Path d="M-12 42 L-8 0 H8 L12 42Z" fill="#FFF8E9" />
          <Path d="M-10 16 H10 V25 H-10Z" fill="#EC805F" />
          <Rect x="-9" y="-9" width="18" height="12" rx="2" fill="#174E61" />
          <Path d="M-13 -9 L0 -20 L13 -9Z" fill="#EC805F" />
          <Path d="M0 33 V42" stroke="#174E61" strokeWidth="5" />
        </G>
        <Path d="M-20 369 C143 310 226 430 384 369 S536 321 620 349 V510 H-20Z" fill="#E1F1E8" />
        <Path d="M-20 383 C143 327 231 444 391 385 S537 339 620 365 V510 H-20Z" fill="#F7DFB1" />
        <Path d="M-20 427 C107 393 207 469 338 437 S515 400 620 421" fill="none" stroke="#EBCB96" strokeWidth="2" />
        <G transform="translate(303 289)">
          <Path d="M-30 11 Q0 35 31 11Z" fill="#F8ECDA" />
          <Path d="M0 9 V-43 L-29 8Z" fill="#F7CA70" />
          <Path d="M5 -37 V8 H30Z" fill="#FFF8E9" />
          <Path d="M-24 28 Q0 33 26 28" fill="none" stroke="#B0DBD1" strokeWidth="2" />
        </G>
        <G transform="translate(123 370) rotate(-12)">
          <Ellipse cx="8" cy="72" rx="62" ry="12" fill="#CEB181" opacity="0.32" />
          <Path d="M0 -20 V70" stroke="#A97C4B" strokeWidth="5" strokeLinecap="round" />
          <Path d="M-72 0 Q0 -109 72 0 Q53 -11 36 0 Q18 -11 0 0 Q-18 -11 -36 0 Q-54 -11 -72 0Z" fill="#EE795C" />
          <Path d="M0 -58 Q-33 -39 -36 0 Q-18 -11 0 0 Q18 -11 36 0 Q30 -37 0 -58Z" fill="#FFF4DD" />
          <Path d="M0 -58 V0" stroke="#D3B390" strokeWidth="1.5" />
        </G>
        <G transform="translate(478 356) rotate(12)">
          <Path d="M13 127 Q-4 48 0 -41" stroke="#AA7B4A" strokeWidth="13" fill="none" />
          <Path d="M0 -44 Q-83 -92 -100 -30 Q-53 -55 0 -44Z M0 -44 Q-81 -37 -66 17 Q-35 -26 0 -44Z M0 -44 Q-29 -128 14 -123 Q-1 -77 0 -44Z M0 -44 Q63 -108 92 -46 Q42 -66 0 -44Z M0 -44 Q84 -40 71 10 Q45 -23 0 -44Z" fill="#397B68" />
          <Circle cx="-3" cy="-34" r="9" fill="#A2794D" />
          <Circle cx="12" cy="-33" r="8" fill="#B48B5B" />
        </G>
        <G transform="translate(318 450) rotate(17)"><Path d="M0 -20 L6 -6 L21 -5 L10 5 L14 21 L0 12 L-14 21 L-10 5 L-21 -5 L-6 -6Z" fill="#EA9976" /><Circle r="3" fill="#F9D1AC" /></G>
        <Path d="M218 414 C225 391 267 397 259 420 S218 457 258 477" fill="none" stroke="#B99068" strokeDasharray="4 7" strokeWidth="2" strokeLinecap="round" />
      </Svg>
      <Animated.View style={[styles.compass, compact && styles.compassCompact, { transform: [{ rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ["-10deg", "10deg"] }) }] }]}><Text style={styles.north}>N</Text><Compass color="#1D5260" size={compact ? 27 : 40} strokeWidth={1.3} /></Animated.View>
      {!compact && <Animated.View style={[styles.postmark, { transform: [{ translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }, { rotate: "-5deg" }] }]}><MapPin size={15} color="#AE503A" /><Text style={styles.postmarkText}>Pangasinan, Philippines</Text></Animated.View>}
    </View>
    {!reduced && <Pressable accessibilityRole="button" accessibilityLabel={paused ? "Play scenery animation" : "Pause scenery animation"} onPress={() => setPaused(value => !value)} style={({ hovered, pressed }) => [styles.motionButton, (hovered || pressed) && { backgroundColor: "#FFFFFF" }]}>{paused ? <Play size={14} color="#1D5260" /> : <Pause size={14} color="#1D5260" />}</Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  scene: { width: "100%", aspectRatio: 600 / 510, borderRadius: 28, overflow: "hidden", backgroundColor: "#DBEFE9" },
  compact: { aspectRatio: 2.9, borderRadius: 20 },
  compass: { position: "absolute", top: 25, right: 25, width: 78, height: 78, backgroundColor: "#FFF9ECCC", borderWidth: 1, borderColor: "#FFFFFF", borderRadius: 39, alignItems: "center", justifyContent: "center", gap: 1 },
  compassCompact: { top: 12, right: 14, width: 54, height: 54, borderRadius: 27 },
  north: { color: "#1D5260", fontFamily: "DMSans", fontSize: 10, fontWeight: "700" },
  postmark: { position: "absolute", top: 26, left: 22, flexDirection: "row", gap: 6, alignItems: "center", padding: 12, borderRadius: 8, backgroundColor: "#FFF8E9" },
  postmarkText: { color: "#6B503B", fontFamily: "DMSans", fontSize: 12 },
  motionButton: { position: "absolute", right: 10, bottom: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "#FFF9ECD9", alignItems: "center", justifyContent: "center" },
});
