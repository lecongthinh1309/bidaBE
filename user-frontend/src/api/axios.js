import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

// Attach JWT token from localStorage if present
api.interceptors.request.use(config => {
  try {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers = config.headers || {}
      config.headers['Authorization'] = 'Bearer ' + token
    }
  } catch (e) {
    // ignore
  }
  return config
})

export default api
