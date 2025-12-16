import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try{
      const res = await api.post('/auth/login', { username, password })
      const token = res.data.token
      if(token){
        localStorage.setItem('token', token)
        // optionally fetch /me to confirm
        try{
          await api.get('/auth/me')
        }catch(e){ /* ignore */ }
        navigate('/')
      }else{
        setError('No token returned')
      }
    }catch(err){
      console.error(err)
      setError(err?.response?.data?.error || 'Login failed')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2>Đăng nhập</h2>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Đang...' : 'Đăng nhập'}</button>
      </form>
    </div>
  )
}
