import axios, { type AxiosError, type AxiosResponse } from "axios"

const baseURL = process.env.NEXT_PUBLIC_API_BASE || "/api"

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
})

// simple interceptor example (could add auth token here)
api.interceptors.response.use(
  (res: AxiosResponse) => res,
  (err: AxiosError) => {
    // central place to handle errors
    return Promise.reject(err)
  }
)

export default api
