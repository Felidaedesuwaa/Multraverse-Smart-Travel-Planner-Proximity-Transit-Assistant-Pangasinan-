import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Bell, Bookmark, Compass, Download, Home,
  Languages, LogOut, MapPin, Settings, Sparkles, Wallet,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import BudgetOverview from "./BudgetOverview";
import SavedTripCard from "./SavedTripCard";

const navigationItems = [
  { label: "Dashboard", icon: Home, screen: "Dashboard" },
  { label: "My Trips", icon: MapPin, screen: "MyTrips" },
  { label: "Budget", icon: Wallet, screen: "Budget" },
  { label: "Saved Places", icon: Bookmark, screen: "SavedPlaces" },
  { label: "Offline Maps", icon: Download, screen: "OfflineMaps" },
  { label: "Settings", icon: Settings, screen: "Settings" },
];

const aiItems = [
  { label: "AI Itinerary", icon: Sparkles, screen: "AIItinerary" },
  { label: "Transit Alarm", icon: Bell, screen: "TransitAlarm" },
  { label: "Translator", icon: Languages, screen: "Translator" },
];

export default function UserSidebar({ activeScreen = "Dashboard", onNavigate }) {
  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [entries, setEntries] = useState([]);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    Promise.all([api.getBudget(), api.getTrips()])
      .then(([budgetEntries, userTrips]) => {
        setEntries(budgetEntries);
        setTrips(userTrips);
      })
      .catch(() => {});
  }, []);

  const name = user?.name || "User";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleNavigate = (screen) => {
    onNavigate?.(screen);
  };

  const renderNavItem = ({ label, icon: Icon, screen }, isAi = false) => {
    const active = activeScreen === screen;
    return (
      <Pressable
        key={screen}
        onPress={() => handleNavigate(screen)}
        style={({ pressed }) => [
          styles.item,
          active && styles.activeItem,
          pressed && !active && styles.pressedItem,
        ]}
      >
        <Icon size={18} color={active ? colors.sunsetCoral : colors.white} />
        <Text style={[styles.itemLabel, active && styles.activeLabel]}>
          {label}
        </Text>
        {isAi && <Text style={styles.aiBadge}>AI</Text>}
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={styles.sidebar}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <Compass size={22} color={colors.white} />
        </View>
        <View>
          <Text style={styles.brandName}>Multraverse</Text>
          <Text style={styles.brandSub}>Pangasinan Edition</Text>
        </View>
      </View>

      {/* Profile */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || "U"}</Text>
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.location}>Explorer · Dagupan City</Text>
        </View>
        <Pressable onPress={handleLogout} accessibilityLabel="Log out" style={styles.logoutIcon}>
          <LogOut size={16} color="#8FB0C2" />
        </Pressable>
      </View>

      {/* Main Nav */}
      <View style={styles.navSection}>
        {navigationItems.map((item) => renderNavItem(item, false))}
      </View>

      {/* AI Tools */}
      <View style={styles.navSection}>
        <Text style={styles.sectionTitle}>AI TOOLS</Text>
        {aiItems.map((item) => renderNavItem(item, true))}
      </View>

      {/* Budget Overview */}
      <View>
        <Text style={styles.sectionTitle}>BUDGET OVERVIEW</Text>
        <BudgetOverview entries={entries} />
      </View>

      {/* Saved Trips */}
      <View>
        <Text style={styles.sectionTitle}>SAVED TRIPS</Text>
        {trips.length > 0 ? (
          trips.slice(0, 3).map((trip) => (
            <SavedTripCard
              key={trip.id}
              title={trip.title}
              date={trip.date}
              status={trip.status === "COMPLETED" ? "completed" : "upcoming"}
              progress={
                trip.budget > 0
                  ? Math.min(100, Math.round((trip.spent / trip.budget) * 100))
                  : 0
              }
            />
          ))
        ) : (
          <Text style={styles.empty}>No saved trips yet</Text>
        )}
      </View>

      {/* Logout */}
      <Pressable onPress={handleLogout} style={styles.logout}>
        <LogOut size={18} color="#FF9B85" />
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 280,
    minWidth: 280,
    maxWidth: 280,
    backgroundColor: colors.oceanBlue,
  },
  content: {
    padding: 18,
    paddingBottom: 32,
    gap: 22,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.sunsetCoral,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.white,
  },
  brandSub: {
    fontSize: 12,
    color: "#8FB0C2",
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sunsetCoral,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontWeight: "700",
    fontSize: 14,
    color: colors.white,
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: "600",
    fontSize: 14,
    color: colors.white,
  },
  location: {
    fontSize: 12,
    color: "#8FB0C2",
  },
  logoutIcon: {
    padding: 6,
    borderRadius: 8,
  },
  navSection: {
    gap: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeItem: {
    backgroundColor: colors.oceanBlueDark,
  },
  pressedItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  itemLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.white,
  },
  activeLabel: {
    color: colors.sunsetCoral,
    fontWeight: "600",
  },
  aiBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.sunsetCoral,
    backgroundColor: "rgba(255,107,74,0.15)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: "#8FB0C2",
    marginBottom: 8,
  },
  empty: {
    fontSize: 13,
    color: "#C9DAE3",
  },
  logout: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 16,
    marginTop: 8,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF9B85",
  },
});
