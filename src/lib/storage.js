import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const protectedKey = key => Platform.OS !== "web" && key === "token";

export const storage = {
  async getItem(key) {
    if (protectedKey(key)) {
      const secured = await SecureStore.getItemAsync(key);
      if (secured) return secured;
      const legacy = await AsyncStorage.getItem(key);
      if (legacy) {
        await SecureStore.setItemAsync(key, legacy);
        await AsyncStorage.removeItem(key);
      }
      return legacy;
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key, value) {
    if (protectedKey(key)) {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (protectedKey(key)) await SecureStore.deleteItemAsync(key);
    return AsyncStorage.removeItem(key);
  },
};
