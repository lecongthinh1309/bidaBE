import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Header(){
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(()=>{
    const load = async ()=>{
      try{
        const res = await api.get('/auth/me')
        setUser(res.data)
      }catch(err){
        setUser(null)
      }
    }
    load()
  }, [])

  const logout = ()=>{
    localStorage.removeItem('token')
    setUser(null)
    navigate('/login')
  }

  return (
    <header className="topbar">
      <div className="container">
        <h1><Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Quán 2TL</Link></h1>
        <nav>
          <Link to="/">Sản phẩm</Link>
          <Link to="/tables" style={{ marginLeft: 12 }}>Bàn</Link>
          <Link to="/reserve" style={{ marginLeft: 12 }}>🎱 Đặt Bàn</Link>
          {user ? (
            <>
              <span style={{ marginLeft: 12 }}>Xin chào, {user.username}</span>
              <button style={{ marginLeft: 8 }} onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{ marginLeft: 12 }}>Đăng nhập</Link>
              <Link to="/register" style={{ marginLeft: 12 }}>Đăng ký</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
