import { useAppTheme } from "../theme/useAppTheme";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { useWorkspaceReducedMotion } from "./WorkspaceMotion";

export default function Card({ children, style }) {
  const { themeStyle, palette } = useAppTheme();
  const [hovered, setHovered] = useState(false);
  const reduced = useWorkspaceReducedMotion();

  return (
    <View onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)} style={[themeStyle([styles.card, style]), hovered && { borderColor: palette.dark ? "#719998" : "#97B6A9", shadowOpacity: 0.13 }, Platform.OS === "web" && { transitionProperty: "border-color, box-shadow", transitionDuration: reduced ? "0ms" : "180ms" }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.oceanBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
});
