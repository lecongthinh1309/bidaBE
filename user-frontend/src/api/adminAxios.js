import axios from 'axios'

const adminApi = axios.create({
  baseURL: 'http://localhost:8080/api'
})

adminApi.interceptors.request.use(config => {
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

export default adminApi
