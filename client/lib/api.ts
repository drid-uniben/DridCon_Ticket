import axios, { type AxiosError, type AxiosInstance } from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000/api/v1'

// IndexedDB helpers
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'))
      return
    }

    const request = indexedDB.open('dridcon-portal', 1)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('tokens')) db.createObjectStore('tokens', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('userData')) db.createObjectStore('userData', { keyPath: 'id' })
    }
  })
}

export const getToken = async (key: string): Promise<string | null> => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['tokens'], 'readonly')
      const store = tx.objectStore('tokens')
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ? req.result.value : null)
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.error('getToken error', error)
    return null
  }
}

export const saveToken = async (key: string, value: string): Promise<boolean> => {
  try {
    const db = await initDB()
    return await new Promise((resolve) => {
      const tx = db.transaction(['tokens'], 'readwrite')
      const store = tx.objectStore('tokens')
      const req = store.put({ id: key, value, timestamp: Date.now() })
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch (error) {
    console.error('saveToken error', error)
    return false
  }
}

export const saveUserData = async (userData: unknown): Promise<boolean> => {
  try {
    const db = await initDB()
    return await new Promise((resolve) => {
      const tx = db.transaction(['userData'], 'readwrite')
      const store = tx.objectStore('userData')
      const req = store.put({ id: 'currentUser', value: userData })
      req.onsuccess = () => resolve(true)
      req.onerror = () => resolve(false)
    })
  } catch (error) {
    console.error('saveUserData error', error)
    return false
  }
}

export const getUserData = async (): Promise<unknown | null> => {
  try {
    const db = await initDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['userData'], 'readonly')
      const store = tx.objectStore('userData')
      const req = store.get('currentUser')
      req.onsuccess = () => resolve(req.result ? req.result.value : null)
      req.onerror = () => reject(req.error)
    })
  } catch (error) {
    console.error('getUserData error', error)
    return null
  }
}

export const clearAllData = async (): Promise<boolean> => {
  try {
    const db = await initDB()
    return await new Promise((resolve) => {
      const tx = db.transaction(['tokens', 'userData'], 'readwrite')
      const tokens = tx.objectStore('tokens')
      const users = tx.objectStore('userData')
      tokens.clear()
      users.clear()
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => resolve(false)
    })
  } catch (error) {
    console.error('clearAllData error', error)
    return false
  }
}

// Axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Attach token from IndexedDB
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken('accessToken')
      if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
    } catch {
      // ignore
    }
    return config
  },
  (err) => Promise.reject(err)
)

// Response handler
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    if (err.response?.status === 401) {
      await clearAllData()
      if (typeof window !== 'undefined') window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth API
export const authApi = {
  register: async (data: Record<string, unknown>) => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v as unknown as string)
    })
    const res = await api.post('/auth/register', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data
  },

  login: async (credentials: { email: string; password: string }) => {
    const res = await api.post('/auth/login', credentials)
    if (res.data?.accessToken) {
      await saveToken('accessToken', res.data.accessToken)
      await saveUserData(res.data.user)
    }
    return res.data
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      await clearAllData()
    }
  },

  completeRegistration: async (data: Record<string, unknown>) => {
    const res = await api.post('/auth/complete-registration', data)
    return res.data
  },

  verifyInvite: async (token: string) => {
    const res = await api.get(`/auth/verify-invite?token=${token}`)
    return res.data
  },

  getMe: async () => {
    const res = await api.get('/auth/me')
    return res.data
  },
}

// Admin API
export const adminApi = {
  createAgent: async (data: { name: string; email: string }) => (await api.post('/admin/agents', data)).data,
  getAgents: async () => (await api.get('/admin/agents')).data,
  manualRegister: async (data: Record<string, unknown>) => (await api.post('/admin/attendees/manual', data)).data,
  inviteAttendee: async (data: Record<string, unknown>) => (await api.post('/admin/attendees/invite', data)).data,
  getPendingAttendees: async () => (await api.get('/admin/attendees/pending')).data,
  approveRegistration: async (id: string) => (await api.post(`/admin/attendees/${id}/approve`)).data,
  declineRegistration: async (id: string) => (await api.post(`/admin/attendees/${id}/decline`)).data,
  getAllAttendees: async () => (await api.get('/admin/attendees')).data,
  getDashboard: async () => (await api.get('/admin/dashboard')).data,
}

// Scan API
export const scanApi = {
  scanQR: async (qrCode: string) => (await api.post('/scan', { qrCode })).data,
  getScanHistory: async () => (await api.get('/scan/history')).data,
}

export default api
