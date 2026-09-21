import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";
import TravelAvatar, { getTravelAvatar } from "./TravelAvatar";

export default function ProfileAvatar({ user, size = 44 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.photo]);
  const name = user?.name || "Traveler";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const preset = getTravelAvatar(user?.photo);
  if (preset) return <TravelAvatar avatar={preset} size={size} label={`${name}'s profile photo: ${preset.name}`} />;
  return <View style={[styles.avatar, shape]}>
    {user?.photo && !failed
      ? <Image accessibilityLabel={`${name}'s profile photo`} source={{ uri: user.photo }} style={shape} resizeMode="cover" onError={() => setFailed(true)} />
      : <Text style={[styles.initials, { fontSize: Math.round(size * 0.36) }]}>{initials || "T"}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  avatar: { backgroundColor: colors.sunsetCoral, alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" },
  initials: { color: "#FFFFFF", fontWeight: "700" },
});
