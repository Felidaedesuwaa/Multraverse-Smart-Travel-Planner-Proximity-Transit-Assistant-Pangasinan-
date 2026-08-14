import { create } from "zustand";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
}

export interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string): Promise<boolean> => {
    void password;
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement actual login API call
      // This is a placeholder implementation
      const mockUser: User = {
        id: "1",
        name: "Test User",
        email,
        role: email.includes("admin") ? "admin" : "user",
      };
      set({ user: mockUser, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
      return false;
    }
  },

  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    void password;
    set({ isLoading: true, error: null });
    try {
      // TODO: Implement actual register API call
      const mockUser: User = {
        id: "1",
        name,
        email,
        role: "user",
      };
      set({ user: mockUser, isAuthenticated: true, isLoading: false });
      return true;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Registration failed",
      });
      return false;
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, error: null });
  },

  setUser: (user) => {
    set({ user, isAuthenticated: user !== null });
  },
}));
