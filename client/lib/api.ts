import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios"

const baseURL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001/api/v1"

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken")
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (err) => Promise.reject(err)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    // Handle 401 unauthorized - clear token and redirect
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("accessToken")
      // Optionally redirect to login
      // window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default api
