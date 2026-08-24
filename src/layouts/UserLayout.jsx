import { StyleSheet, View } from "react-native";
import UserSidebar from "../components/UserSidebar";
import { colors } from "../theme/colors";

export default function UserLayout({ children }) {
  return <View style={styles.layout}><UserSidebar /><View style={styles.content}>{children}</View></View>;
}

const styles = StyleSheet.create({
  layout: { flex: 1, flexDirection: "row", backgroundColor: colors.warmSand },
  content: { flex: 1, minWidth: 0 },
});
