import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View, useWindowDimensions } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
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
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeScreen, setActiveScreen] = useState("Dashboard");

  const handleNavigate = (screen) => {
    setActiveScreen(screen);
    navigationRef.current?.navigate("User", { screen });
  };

  return (
    <View style={styles.layout}>
      {isWide && (
        <View style={styles.userSidebarContainer}>
          <UserSidebar activeScreen={activeScreen} onNavigate={handleNavigate} />
        </View>
      )}
      <View style={styles.content}>
        <UserStack.Navigator screenOptions={{ headerShown: false }}>
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
    </View>
  );
}

// ── Admin screens with sidebar ──────────────────────────
function AdminScreens() {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const [activeScreen, setActiveScreen] = useState("AdminDashboard");

  const handleNavigate = (screen) => {
    setActiveScreen(screen);
    navigationRef.current?.navigate("Admin", { screen });
  };

  return (
    <View style={styles.layout}>
      {isWide && (
        <View style={styles.adminSidebarContainer}>
          <AdminSidebar activeScreen={activeScreen} onNavigate={handleNavigate} />
        </View>
      )}
      <View style={styles.content}>
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
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.sunsetCoral} />
    </View>
  );
}

export default function App() {
  const init = useAuthStore((state) => state.init);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    init().finally(() => setReady(true));
  }, [init]);

  if (!ready) return <LoadingScreen />;

  return (
    <NavigationContainer
      linking={linking}
      ref={(ref) => {
        navigationRef.current = ref;
      }}
    >
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
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
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
