import { View, StyleSheet } from "react-native";
import { Mountain, Sailboat, TreePalm, Tent, Plane, Compass, Camera, Backpack, Globe, Bus, TrainFront, Waves, Luggage, Bike, Sun, Ship } from "lucide-react-native";
import avatars from "../data/profileAvatars.json";

const icons = { Mountain, Sailboat, TreePalm, Tent, Plane, Compass, Camera, Backpack, Globe, Bus, TrainFront, Waves, Luggage, Bike, Sun, Ship };
export const travelAvatars = avatars;
export const getTravelAvatar = id => avatars.find(avatar => avatar.id === id);

export default function TravelAvatar({ avatar, size = 44, label }) {
  const Icon = icons[avatar.icon];
  return <View accessible accessibilityRole="image" accessibilityLabel={label || avatar.name}
    style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: avatar.background }]}>
    <View style={{ position: "absolute", width: size * 0.9, height: size * 0.9, borderRadius: size, backgroundColor: avatar.accent, top: size * 0.52, left: -size * 0.12 }} />
    <View style={{ position: "absolute", width: size * 0.18, height: size * 0.18, borderRadius: size, backgroundColor: "#FFFFFF", opacity: 0.7, top: size * 0.14, right: size * 0.17 }} />
    <Icon size={size * 0.56} color={avatar.ink} strokeWidth={1.8} />
  </View>;
}
const styles = StyleSheet.create({ circle: { overflow: "hidden", alignItems: "center", justifyContent: "center", flexShrink: 0 } });
