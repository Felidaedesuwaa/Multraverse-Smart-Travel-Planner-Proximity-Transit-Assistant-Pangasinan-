import { create } from 'zustand'
import { api } from '../lib/api'
import { storage } from '../lib/storage'

// Includes SUPERADMIN, ADMIN, LGU and EXPLORER roles without dropping account fields.
// Keep role and municipality in the persisted user profile, including refreshes.
const accountState = user => ({ user, role: user?.role || null, municipality: user?.municipality || null })

export const useAuthStore = create((set, get) => ({
  user: null,
  role: null,
  municipality: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  fieldErrors: {},

  init: async () => {
    const token = await storage.getItem('token')
    const user = await storage.getItem('user')
    if (token && user) {
      set({ ...accountState(JSON.parse(user)), isAuthenticated: true })
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
      set(accountState(user))
      await storage.setItem('user', JSON.stringify(user))
    } catch (error) {
      if (error.status === 401 && get().user === previous) await get().logout()
      // Keep the last saved profile when offline.
    }
  },

  updateProfile: async changes => {
    const previous = get().user
    const user = await api.updateMe(changes)
    if (!user?.id) throw new Error('Could not save your profile. Please try again.')
    if (!get().isAuthenticated || get().user?.id !== previous?.id) return
    set(accountState(user))
    await storage.setItem('user', JSON.stringify(user))
    return user
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await api.login(email, password)
      await storage.setItem('token', data.token)
      await storage.setItem('user', JSON.stringify(data.user))
      set({ ...accountState(data.user), isAuthenticated: true, isLoading: false })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Login failed', isLoading: false })
      return false
    }
  },

  register: async fields => {
    set({ isLoading: true, error: null, fieldErrors: {} })
    try {
      const data = await api.register(fields)
      set({ isLoading: false })
      return data
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Registration failed', fieldErrors: error.fieldErrors || {}, isLoading: false })
      return false
    }
  },

  verifyRegistration: async (challengeId, code) => {
    set({ isLoading: true, error: null, fieldErrors: {} })
    try {
      const data = await api.verifyRegistration(challengeId, code)
      await storage.setItem('token', data.token)
      await storage.setItem('user', JSON.stringify(data.user))
      set({ ...accountState(data.user), isAuthenticated: true, isLoading: false })
      return true
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Verification failed', fieldErrors: error.fieldErrors || {}, isLoading: false })
      return false
    }
  },

  deleteAccount: async password => {
    const userId = get().user?.id
    await api.deleteMe(password)
    // Purge this device's credentials and account-specific offline plans.
    try {
      await get().logout()
    } finally {
      set({ ...accountState(null), isAuthenticated: false, error: null, fieldErrors: {} })
      await Promise.all([
        storage.removeItem(`planner:v1:${userId}:plan`),
        storage.removeItem(`planner:v1:${userId}:catalog`),
      ])
    }
  },

  logout: async () => {
    try {
      await Promise.all([storage.removeItem('token'), storage.removeItem('user')])
    } finally {
      set({ ...accountState(null), isAuthenticated: false, isLoading: false, error: null, fieldErrors: {} })
    }
  },
}))
