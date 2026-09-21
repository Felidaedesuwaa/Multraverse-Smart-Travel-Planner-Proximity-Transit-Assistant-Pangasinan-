import { create } from 'zustand'
import { api } from '../lib/api'
import { storage } from '../lib/storage'

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  init: async () => {
    const token = await storage.getItem('token')
    const user = await storage.getItem('user')
    if (token && user) {
      set({ user: JSON.parse(user), isAuthenticated: true })
      // Refresh account details without preventing cached/offline startup.
      get().refreshProfile()
    }
  },

  refreshProfile: async () => {
    const previous = get().user
    if (!previous) return
    try {
      const user = await api.getMe()
      if (!user?.id || get().user !== previous) return
      set({ user })
      await storage.setItem('user', JSON.stringify(user))
    } catch { /* Keep the last saved profile when offline. */ }
  },

  updateProfile: async changes => {
    const previous = get().user
    const user = await api.updateMe(changes)
    if (!user?.id) throw new Error('Could not save your profile. Please try again.')
    if (!get().isAuthenticated || get().user?.id !== previous?.id) return
    set({ user })
    await storage.setItem('user', JSON.stringify(user))
    return user
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.login(email, password)
      await storage.setItem('token', data.token)
      await storage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, isAuthenticated: true, isLoading: false })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed', isLoading: false })
      return false
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.register(name, email, password)
      await storage.setItem('token', data.token)
      await storage.setItem('user', JSON.stringify(data.user))
      set({ user: data.user, isAuthenticated: true, isLoading: false })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Registration failed', isLoading: false })
      return false
    }
  },

  logout: async () => {
    await storage.removeItem('token')
    await storage.removeItem('user')
    set({ user: null, isAuthenticated: false })
  },
}))
