import axios from 'axios'
import { supabase } from './supabaseClient'

const API_URL = import.meta.env.VITE_API_URL || 'https://youtube-script-generator-mnkq.onrender.com'

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth interceptor
api.interceptors.request.use(
  async (config) => {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !session) {
        // Can't refresh, redirect to login
        supabase.auth.signOut()
        return Promise.reject(error)
      }
      
      // Retry original request with new token
      error.config.headers.Authorization = `Bearer ${session.access_token}`
      return api.request(error.config)
    }
    
    return Promise.reject(error)
  }
)

export { api, API_URL }