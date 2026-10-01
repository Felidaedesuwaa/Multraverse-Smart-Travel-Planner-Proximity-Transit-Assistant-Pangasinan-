import { FeedbackPressable } from "./WorkspaceMotion";
import { useAppTheme } from "../theme/useAppTheme";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BarChart3, Circle, Compass, LayoutGrid,
  LogOut, Radio, Route, Settings, Users, Zap,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { useAuthStore } from "../store/authStore";

const items = [
  { label: "LGU approvals", icon: LayoutGrid, screen: "AdminApprovals" },
  { label: "Overview", icon: LayoutGrid, screen: "AdminDashboard" },
  { label: "Routes", icon: Route, screen: "AdminRoutes" },
  { label: "Geofences", icon: Radio, screen: "AdminGeofences" },
  { label: "Users", icon: Users, screen: "AdminUsers" },
  { label: "AI Controls", icon: Zap, screen: "AdminAIControls" },
  { label: "Analytics", icon: BarChart3, screen: "AdminAnalytics" },
  { label: "Settings", icon: Settings, screen: "AdminSettings" },
];

export default function AdminSidebar({ activeScreen = "AdminDashboard", onNavigate }) {
  const { themeStyle, themeColor, palette } = useAppTheme();

  const navigation = useNavigation();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <View style={themeStyle([styles.sidebar, { backgroundColor: palette.dark ? palette.deep : palette.primary }])}>
      <ScrollView showsVerticalScrollIndicator={false} style={themeStyle(styles.scrollContent)}>
        {/* Brand */}
        <View style={themeStyle(styles.brand)}>
          <View style={themeStyle([styles.brandIcon, { backgroundColor: palette.brand }])}>
            <Compass size={20} color={themeColor(colors.white, "color")} />
          </View>
          <View>
            <Text style={themeStyle(styles.brandName)}>Multraverse</Text>
            <Text style={themeStyle(styles.brandSub)}>Admin Console</Text>
          </View>
        </View>

        {/* Nav Items */}
        <View style={themeStyle(styles.navSection)}>
          {items.map(({ label, icon: Icon, screen }) => {
            const active = activeScreen === screen;
            return (
              <FeedbackPressable
                key={screen}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => onNavigate?.(screen)}
                style={themeStyle(({ pressed, hovered }) => [
                  styles.item,
                  active && styles.activeItem,
                  (pressed || hovered) && !active && styles.pressedItem,
                ])}
              >
                <Icon
                  size={18}
                  color={active ? palette.button : palette.onPrimary}
                />
                <Text style={themeStyle([styles.label, active && styles.activeLabel, active && { color: palette.button }])}>
                  {label}
                </Text>
              </FeedbackPressable>
            );
          })}
        </View>
      </ScrollView>

      {/* System Status */}
      <View style={themeStyle(styles.status)}>
        <Circle size={9} fill={themeColor(colors.palmGreen, "fill")} color={themeColor(colors.palmGreen, "color")} />
        <View>
          <Text style={themeStyle(styles.statusTitle)}>System Status</Text>
          <Text style={themeStyle(styles.statusText)}>All systems operational</Text>
        </View>
      </View>
      <FeedbackPressable onPress={handleLogout} accessibilityLabel="Log out" style={themeStyle(styles.logout)}>
        <LogOut size={18} color={themeColor("#FF9B85", "color")} />
        <Text style={themeStyle(styles.logoutText)}>Log out</Text>
      </FeedbackPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 260,
    minWidth: 260,
    maxWidth: 260,
    backgroundColor: colors.oceanBlue,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    flex: 1,
    justifyContent: "space-between",
  },
  scrollContent: { flex: 1 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
    marginTop: 6,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.sunsetCoral,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontWeight: "700",
    fontSize: 15,
    color: colors.white,
  },
  brandSub: {
    fontSize: 11,
    color: "#8FB0C2",
  },
  navSection: {
    gap: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeItem: {
    backgroundColor: colors.oceanBlueDark,
  },
  pressedItem: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  label: {
    fontSize: 14,
    color: colors.white,
  },
  activeLabel: {
    color: colors.sunsetCoral,
    fontWeight: "600",
  },
  status: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  statusTitle: {
    fontSize: 11,
    color: "#8FB0C2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.white,
  },
  logout: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 16,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FF9B85",
  },
});
