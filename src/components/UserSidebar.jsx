import { useAppTheme } from "../theme/useAppTheme";
import { darkPalette } from "../theme/darkPalette";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Bell, Bookmark, Compass, Download, Home,
  Languages, LogOut, MapPin, Settings, Sparkles, Wallet,
} from "lucide-react-native";
import { colors } from "../theme/colors";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import BudgetOverview from "./BudgetOverview";
import SavedTripCard from "./SavedTripCard";
import ProfileAvatar from "./ProfileAvatar";

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

export default function UserSidebar({ activeScreen = "Dashboard", onNavigate, compact = false }) {
  const { themeStyle, themeColor, isDark } = useAppTheme();

  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [entries, setEntries] = useState([]);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (compact) return;
    Promise.all([api.getBudget(), api.getTrips()])
      .then(([budgetEntries, userTrips]) => {
        setEntries(budgetEntries);
        setTrips(userTrips);
      })
      .catch(() => {});
  }, [compact]);

  const name = user?.name || "User";

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigate = (screen) => {
    onNavigate?.(screen);
  };

  const renderNavItem = ({ label, icon: Icon, screen }, isAi = false) => {
    const active = activeScreen === screen;
    return (
      <Pressable
        key={screen}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPress={() => handleNavigate(screen)}
        style={themeStyle(({ pressed }) => [
          styles.item,
          active && styles.activeItem,
          pressed && !active && styles.pressedItem,
        ])}
      >
        <Icon size={18} color={themeColor(active ? colors.sunsetCoral : colors.white, "color")} />
        <Text style={themeStyle([styles.itemLabel, active && styles.activeLabel])}>
          {label}
        </Text>
        {isAi && <Text style={themeStyle(styles.aiBadge)}>AI</Text>}
      </Pressable>
    );
  };

  return (
    <ScrollView
      style={[themeStyle([styles.sidebar, compact && styles.compactSidebar]), isDark && { backgroundColor: darkPalette.inset }]}
      contentContainerStyle={themeStyle(styles.content)}
      showsVerticalScrollIndicator={false}
    >
      {/* Brand */}
      <View style={themeStyle(styles.brand)}>
        <View style={themeStyle(styles.brandIcon)}>
          <Compass size={22} color={themeColor(colors.white, "color")} />
        </View>
        <View>
          <Text style={themeStyle(styles.brandName)}>Multraverse</Text>
          <Text style={themeStyle(styles.brandSub)}>Pangasinan Edition</Text>
        </View>
      </View>

      {/* Profile */}
      <View style={themeStyle(styles.profile)}>
        <ProfileAvatar user={user} size={40} />
        <View style={themeStyle(styles.profileText)}>
          <Text style={themeStyle(styles.name)} numberOfLines={1}>{name}</Text>
          <Text style={themeStyle(styles.location)}>{user?.role === "PRO" ? "Pro" : "Explorer"}{user?.location ? ` · ${user.location}` : ""}</Text>
        </View>
        <Pressable onPress={handleLogout} accessibilityLabel="Log out" style={themeStyle(styles.logoutIcon)}>
          <LogOut size={16} color={themeColor("#8FB0C2", "color")} />
        </Pressable>
      </View>

      {/* Main Nav */}
      <View style={themeStyle(styles.navSection)}>
        {navigationItems.map((item) => renderNavItem(item, false))}
      </View>

      {/* AI Tools */}
      <View style={themeStyle(styles.navSection)}>
        <Text style={themeStyle(styles.sectionTitle)}>AI TOOLS</Text>
        {aiItems.map((item) => renderNavItem(item, true))}
      </View>

      {!compact && <>
      {/* Budget Overview */}
      <View>
        <Text style={themeStyle(styles.sectionTitle)}>BUDGET OVERVIEW</Text>
        <BudgetOverview entries={entries} />
      </View>

      {/* Saved Trips */}
      <View>
        <Text style={themeStyle(styles.sectionTitle)}>SAVED TRIPS</Text>
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
          <Text style={themeStyle(styles.empty)}>No saved trips yet</Text>
        )}
      </View>

      </>}
      {/* Logout */}
      <Pressable accessibilityRole="button" onPress={handleLogout} style={themeStyle(styles.logout)}>
        <LogOut size={18} color={themeColor("#FF9B85", "color")} />
        <Text style={themeStyle(styles.logoutText)}>Log Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  compactSidebar: { width: "100%", minWidth: 0, maxWidth: "100%", flex: 1 },
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
    minHeight: 48,
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
