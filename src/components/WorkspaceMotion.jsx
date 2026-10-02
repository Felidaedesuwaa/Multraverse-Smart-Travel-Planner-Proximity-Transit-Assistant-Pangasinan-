import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useAppTheme } from "../theme/useAppTheme";

const ReducedMotion = createContext(true);
const UserInteractions = createContext(false);
export const useWorkspaceReducedMotion = () => useContext(ReducedMotion);

export function UserInteractionProvider({ children }) {
  return <UserInteractions.Provider value={true}>{children}</UserInteractions.Provider>;
}

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
export function FeedbackPressable({ style, children, onPress, disabled, onFocus, onBlur, lift, focusRing = "outside", ...props }) {
  const { palette, isDark } = useAppTheme();
  const reduced = useContext(ReducedMotion);
  const userInteractions = useContext(UserInteractions);
  const animateLift = lift ?? (userInteractions && props.accessibilityRole !== "link");
  const [focused, setFocused] = useState(false);
  const interactive = (!!onPress || props.accessibilityRole === "button") && !disabled;
  return <Pressable {...props} onPress={onPress} disabled={disabled} onFocus={event => { setFocused(Platform.OS !== "web" || (event.currentTarget?.matches?.(":focus-visible") ?? true)); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }}
    style={state => {
      const base = typeof style === "function" ? style(state) : style;
      const flattened = StyleSheet.flatten(base);
      const hovered = state.hovered && (!userInteractions || props.accessibilityRole !== "link");
      const active = interactive && (state.pressed || hovered || focused);
      const hoverShadow = Platform.OS === "web" && userInteractions && interactive && animateLift && !reduced && hovered && !state.pressed && flattened?.backgroundColor && flattened.backgroundColor !== "transparent" && !flattened.boxShadow && !flattened.shadowOpacity;
      return [base, active && { opacity: (flattened?.opacity ?? 1) * (state.pressed ? 0.9 : 0.96) },
        interactive && !reduced && animateLift && { transform: [...(flattened?.transform || []), { translateY: state.pressed ? 1 : hovered ? -2 : 0 }, { scale: state.pressed ? 0.985 : userInteractions && hovered ? 1.015 : 1 }] },
        hoverShadow && { boxShadow: `0 4px 12px rgba(0, 0, 0, ${isDark ? 0.24 : 0.12})` },
        Platform.OS === "web" && interactive && { transitionProperty: "opacity, transform, background-color, border-color, box-shadow", transitionDuration: reduced ? "0ms" : "180ms", transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)", outlineStyle: focused ? "solid" : "none", ...(focused ? { outlineWidth: 2, outlineColor: palette.button, outlineOffset: focusRing === "inset" ? -3 : 2 } : {}) }];
    }}>{children}</Pressable>;
}
