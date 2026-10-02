import { useState } from "react";
import { Pressable, Text } from "react-native";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

export default function ChangePasswordButton({ inverted = false }) {
  const [open, setOpen] = useState(false);
  const { themeColor } = useAppTheme();
  return <><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ padding: 12, minHeight: 44, justifyContent: "center" }}><Text style={{ color: inverted ? colors.white : themeColor(colors.oceanBlue), fontSize: 14 }}>Change password</Text></Pressable>{open && <ChangePasswordDialog onClose={() => setOpen(false)} />}</>;
}
