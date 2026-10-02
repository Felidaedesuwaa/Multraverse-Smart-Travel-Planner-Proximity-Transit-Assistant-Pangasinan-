import { useState } from "react";
import { Pressable, Text } from "react-native";
import { KeyRound } from "lucide-react-native";
import ChangePasswordDialog from "./ChangePasswordDialog";
import { useAppTheme } from "../theme/useAppTheme";
import { colors } from "../theme/colors";

export default function ChangePasswordButton({ inverted = false }) {
  const [open, setOpen] = useState(false);
  const { themeColor } = useAppTheme();
  const foreground = inverted ? colors.white : themeColor(colors.oceanBlue);
  return <><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={{ padding: 12, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8 }}><KeyRound size={18} color={foreground} /><Text style={{ color: foreground, fontSize: 14 }}>Change password</Text></Pressable>{open && <ChangePasswordDialog onClose={() => setOpen(false)} />}</>;
}
