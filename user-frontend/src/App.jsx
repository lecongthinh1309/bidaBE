import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Products from './pages/Products'
import Login from './pages/Login'
import Register from './pages/Register'
import Tables from './pages/Tables'
import ReserveTables from './pages/ReserveTables'
import Header from './components/Header'

export default function App(){
  return (
    <BrowserRouter>
      <Header />
      <main style={{ padding: 20 }}>
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/reserve" element={<ReserveTables />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
