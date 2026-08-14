import type { ReactElement } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AIItinerary from "./pages/AIItinerary";
import TransitAlarm from "./pages/TransitAlarm";
import Translator from "./pages/Translator";
import MyTrips from "./pages/MyTrips";
import Budget from "./pages/Budget";
import SavedPlaces from "./pages/SavedPlaces";
import OfflineMaps from "./pages/OfflineMaps";
import SettingsPage from "./pages/SettingsPage";
import UserLayout from "./layouts/UserLayout";
import { useAuthStore } from "./store/authStore";

function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Admin route (has its own layout) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* All user routes share the sidebar layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserDashboard />} />
          <Route path="my-trips" element={<MyTrips />} />
          <Route path="budget" element={<Budget />} />
          <Route path="saved-places" element={<SavedPlaces />} />
          <Route path="offline-maps" element={<OfflineMaps />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="ai-itinerary" element={<AIItinerary />} />
          <Route path="transit-alarm" element={<TransitAlarm />} />
          <Route path="translator" element={<Translator />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
