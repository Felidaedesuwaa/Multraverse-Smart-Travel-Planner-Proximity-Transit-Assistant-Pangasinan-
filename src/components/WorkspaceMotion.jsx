import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useAppTheme } from "../theme/useAppTheme";

const ReducedMotion = createContext(true);
export const useWorkspaceReducedMotion = () => useContext(ReducedMotion);

export function WorkspaceMotionProvider({ children }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { alive = false; subscription?.remove(); };
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}

export function ScreenMotion({ children }) {
  const focused = useIsFocused();
  const reduced = useContext(ReducedMotion);
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || !focused) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== "web", isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [focused, progress, reduced]);
  return <Animated.View testID="workspace-screen-motion" style={{ flex: 1, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>{children}</Animated.View>;
}

// A Pressable with no extra layout wrapper. Existing handlers, disabled states,
// and style callbacks are preserved, including nested modal action buttons.
export function FeedbackPressable({ style, children, onPress, disabled, onFocus, onBlur, lift = false, ...props }) {
  const { palette } = useAppTheme();
  const reduced = useContext(ReducedMotion);
  const [focused, setFocused] = useState(false);
  const interactive = !!onPress && !disabled;
  return <Pressable {...props} onPress={onPress} disabled={disabled} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={state => {
      const base = typeof style === "function" ? style(state) : style;
      const active = interactive && (state.pressed || state.hovered || focused);
      return [base, active && { opacity: state.pressed ? 0.82 : 0.94 },
        interactive && !reduced && lift && { transform: [...(StyleSheet.flatten(base)?.transform || []), { translateY: state.pressed ? 1 : state.hovered ? -2 : 0 }] },
        Platform.OS === "web" && interactive && { transitionProperty: "opacity, transform, background-color, box-shadow", transitionDuration: reduced ? "0ms" : "160ms", ...(focused ? { outlineStyle: "solid", outlineWidth: 2, outlineColor: palette.button, outlineOffset: 2 } : {}) }];
    }}>{children}</Pressable>;
}
