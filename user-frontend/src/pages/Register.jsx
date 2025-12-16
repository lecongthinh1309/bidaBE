import React, { useState } from 'react'
import api from '../api/axios'
import { useNavigate } from 'react-router-dom'

export default function Register(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try{
      await api.post('/auth/register', { username, password, fullName, role: 'ROLE_USER' })
      // auto-login after register
      const res = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', res.data.token)
      navigate('/')
    }catch(err){
      console.error(err)
      setError(err?.response?.data?.error || 'Đăng ký thất bại')
    }finally{ setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <h2>Đăng ký tài khoản</h2>
      <form onSubmit={submit}>
        <div style={{ marginBottom: 8 }}>
          <label>Username</label>
          <input value={username} onChange={e=>setUsername(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Full name</label>
          <input value={fullName} onChange={e=>setFullName(e.target.value)} style={{ width: '100%' }} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <button type="submit" disabled={loading}>{loading ? 'Đang...' : 'Đăng ký'}</button>
      </form>
    </div>
  )
}
