import { Outlet } from "react-router-dom";
import { colors } from "../theme/colors";
import UserSidebar from "../components/UserSidebar";

export default function UserLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: colors.warmSand,
      }}
    >
      <UserSidebar />
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}