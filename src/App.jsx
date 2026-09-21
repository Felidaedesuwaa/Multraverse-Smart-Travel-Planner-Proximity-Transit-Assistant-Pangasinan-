import { useAppTheme } from "./theme/useAppTheme";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Modal, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from "react-native-safe-area-context";
import { Menu, X } from "lucide-react-native";
import { DarkTheme, DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { usePreferencesStore } from "./store/preferencesStore";
import CurrencyNotice from "./components/CurrencyNotice";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "./theme/colors";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import TransitAlarm from "./pages/TransitAlarm";
import AIItinerary from "./pages/AIItinerary";
import Translator from "./pages/Translator";
import MyTrips from "./pages/MyTrips";
import Budget from "./pages/Budget";
import SavedPlaces from "./pages/SavedPlaces";
import OfflineMaps from "./pages/OfflineMaps";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminRoutes from "./pages/AdminRoutes";
import AdminGeofences from "./pages/AdminGeofences";
import AdminUsers from "./pages/AdminUsers";
import AdminAIControls from "./pages/AdminAIControls";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminSettings from "./pages/AdminSettings";
import UserSidebar from "./components/UserSidebar";
import AdminSidebar from "./components/AdminSidebar";

const RootStack = createNativeStackNavigator();
const UserStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();

// The sidebars are siblings of their nested stack navigators, so use this
// bridge to dispatch navigation actions to the currently active navigator.
export const navigationRef = { current: null };

const linking = {
  prefixes: [],
  config: {
    screens: {
      // Keep the localhost root on the sign-in screen. Protected routes are
      // only registered after authentication, so deep links cannot bypass it.
      Login: "",
      Register: "register",
      User: {
        screens: {
          Dashboard: "",
          MyTrips: "my-trips",
          Budget: "budget",
          SavedPlaces: "saved-places",
          OfflineMaps: "offline-maps",
          Settings: "settings",
          AIItinerary: "ai-itinerary",
          TransitAlarm: "transit-alarm",
          Translator: "translator",
        },
      },
      Admin: {
        screens: {
          AdminDashboard: "admin",
          AdminRoutes: "admin/routes",
          AdminGeofences: "admin/geofences",
          AdminUsers: "admin/users",
          AdminAIControls: "admin/ai-controls",
          AdminAnalytics: "admin/analytics",
          AdminSettings: "admin/settings",
        },
      },
    },
  },
};

// ── User screens with sidebar ───────────────────────────
function UserScreens() {
  const { themeStyle, themeColor } = useAppTheme();

  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeScreen, setActiveScreen] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (isWide) setMenuOpen(false);
  }, [isWide]);

  const handleNavigate = (screen) => {
    setMenuOpen(false);
    setActiveScreen(screen);
    navigationRef.current?.navigate("User", { screen });
  };

  return (
    <View style={themeStyle(styles.layout)}>
      {isWide && (
        <View style={themeStyle(styles.userSidebarContainer)}>
          <UserSidebar activeScreen={activeScreen} onNavigate={handleNavigate} />
        </View>
      )}
      <View style={themeStyle(styles.content)}>
        <UserStack.Navigator
          screenListeners={({ route }) => ({ focus: () => setActiveScreen(route.name) })}
          screenOptions={{
            headerShown: !isWide,
            headerTitle: "Multraverse",
            headerTintColor: themeColor(colors.oceanBlue),
            headerStyle: themeStyle({ backgroundColor: colors.warmSand }),
            headerBackVisible: false,
            headerLeft: () => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
                accessibilityState={{ expanded: menuOpen }}
                onPress={() => setMenuOpen(true)}
                style={themeStyle(styles.menuButton)}
              >
                <Menu size={24} color={themeColor(colors.oceanBlue, "color")} />
              </Pressable>
            ),
          }}
        >
          <UserStack.Screen name="Dashboard" component={UserDashboard} />
          <UserStack.Screen name="MyTrips" component={MyTrips} />
          <UserStack.Screen name="Budget" component={Budget} />
          <UserStack.Screen name="SavedPlaces" component={SavedPlaces} />
          <UserStack.Screen name="OfflineMaps" component={OfflineMaps} />
          <UserStack.Screen name="Settings" component={SettingsPage} />
          <UserStack.Screen name="AIItinerary" component={AIItinerary} />
          <UserStack.Screen name="TransitAlarm" component={TransitAlarm} />
          <UserStack.Screen name="Translator" component={Translator} />
        </UserStack.Navigator>
      </View>
      <Modal
        visible={!isWide && menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={themeStyle(styles.drawerOverlay)}>
          <Pressable
            style={themeStyle(StyleSheet.absoluteFill)}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
            onPress={() => setMenuOpen(false)}
          />
          <SafeAreaView style={themeStyle([styles.drawer, { width: Math.min(320, width - 32) }])}>
            <View style={themeStyle(styles.drawerHeader)}>
              <Text style={themeStyle(styles.drawerTitle)}>Menu</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
                onPress={() => setMenuOpen(false)}
                style={themeStyle(styles.menuButton)}
              >
                <X size={24} color={themeColor(colors.white, "color")} />
              </Pressable>
            </View>
            <UserSidebar compact activeScreen={activeScreen} onNavigate={handleNavigate} />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

// ── Admin screens with sidebar ──────────────────────────
function AdminScreens() {
  const { themeStyle } = useAppTheme();

  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeScreen, setActiveScreen] = useState("AdminDashboard");

  const handleNavigate = (screen) => {
    setActiveScreen(screen);
    navigationRef.current?.navigate("Admin", { screen });
  };

  return (
    <View style={themeStyle(styles.layout)}>
      {isWide && (
        <View style={themeStyle(styles.adminSidebarContainer)}>
          <AdminSidebar activeScreen={activeScreen} onNavigate={handleNavigate} />
        </View>
      )}
      <View style={themeStyle(styles.content)}>
        <AdminStack.Navigator screenOptions={{ headerShown: false }}>
          <AdminStack.Screen name="AdminDashboard" component={AdminDashboard} />
          <AdminStack.Screen name="AdminRoutes" component={AdminRoutes} />
          <AdminStack.Screen name="AdminGeofences" component={AdminGeofences} />
          <AdminStack.Screen name="AdminUsers" component={AdminUsers} />
          <AdminStack.Screen name="AdminAIControls" component={AdminAIControls} />
          <AdminStack.Screen name="AdminAnalytics" component={AdminAnalytics} />
          <AdminStack.Screen name="AdminSettings" component={AdminSettings} />
        </AdminStack.Navigator>
      </View>
    </View>
  );
}

function LoadingScreen() {
  const { themeStyle, themeColor } = useAppTheme();

  return (
    <View style={themeStyle(styles.loading)}>
      <ActivityIndicator size="large" color={themeColor(colors.sunsetCoral, "color")} />
    </View>
  );
}

export default function App() {
  const { isDark, background, surface, text } = useAppTheme();
  const init = useAuthStore((state) => state.init);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([init(), usePreferencesStore.getState().init()]).finally(() => setReady(true));
    const listener = AppState.addEventListener("change", state => {
      if (state === "active" && usePreferencesStore.getState().currency !== "PHP") usePreferencesStore.getState().refreshRates();
    });
    return () => listener.remove();
  }, [init]);

  if (!ready) return <LoadingScreen />;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
    <NavigationContainer
      theme={{ ...(isDark ? DarkTheme : DefaultTheme), colors: { ...(isDark ? DarkTheme : DefaultTheme).colors, background, card: surface, text, primary: colors.sunsetCoral } }}
      linking={linking}
      ref={(ref) => {
        navigationRef.current = ref;
      }}
    >
      <View style={{ flex: 1, backgroundColor: background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={background} />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          user?.role === "ADMIN" ? (
            <RootStack.Screen name="Admin" component={AdminScreens} />
          ) : (
            <RootStack.Screen name="User" component={UserScreens} />
          )
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginPage} />
            <RootStack.Screen name="Register" component={RegisterPage} />
          </>
        )}
      </RootStack.Navigator>
      <CurrencyNotice />
      </View>
    </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  drawer: { flex: 1, backgroundColor: colors.oceanBlue },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 18,
    paddingRight: 6,
  },
  drawerTitle: { color: colors.white, fontSize: 18, fontWeight: "700" },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warmSand,
  },
  layout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.warmSand,
  },
  userSidebarContainer: {
    width: 280,
    minWidth: 280,
    maxWidth: 280,
  },
  adminSidebarContainer: {
    width: 260,
    minWidth: 260,
    maxWidth: 260,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
});
