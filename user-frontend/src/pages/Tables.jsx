import React, { useEffect, useState } from 'react'
import api from '../api/axios'

export default function Tables(){
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(()=>{ load() }, [])

  const load = async ()=>{
    setLoading(true)
    setError(null)
    try{
      const res = await api.get('/tables')
      const tablesData = res.data || []

      // fetch active session for occupied tables
      const withSessions = await Promise.all(tablesData.map(async (t) => {
        if (t.status === 'OCCUPIED') {
          try {
            const s = await api.get(`/invoices/sessions/${t.id}`)
            return { ...t, currentSession: s.data }
          } catch (e) {
            return { ...t, currentSession: null }
          }
        }
        return { ...t, currentSession: null }
      }))

      setTables(withSessions)
    }catch(err){
      console.error(err)
      setError('Không tải được danh sách bàn')
    }finally{ setLoading(false) }
  }

  const reserve = async (t)=>{
    if(!confirm(`Đặt ${t.name}?`)) return
    try{
      const payload = {
        name: t.name,
        pricePerHour: t.pricePerHour,
        status: 'RESERVED',
        reservationTime: new Date().toISOString()
      }
      await api.put(`/tables/${t.id}`, payload)
      alert('Đặt bàn thành công')
      load()
    }catch(err){
      console.error(err)
      alert(err?.response?.data?.error || 'Đặt bàn thất bại')
    }
  }

  return (
    <div>
      <h2>Đặt bàn</h2>
      {loading ? <p>Đang tải...</p> : (
        <div>
          {error && <div style={{ color: 'red' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {tables.map(t=> (
              <div key={t.id} style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
                <h3>{t.name}</h3>
                <p style={{ color: '#555' }}>{t.description || ''}</p>
                {t.reservationTime && (
                  <p style={{ color: '#b85' }}>Đã đặt lúc: {new Date(t.reservationTime).toLocaleString()}</p>
                )}
                {t.currentSession && t.currentSession.startTime && (
                  <p>Bắt đầu: {new Date(t.currentSession.startTime).toLocaleString()}</p>
                )}
                {t.currentSession && t.currentSession.endTime && (
                  <p>Kết thúc: {new Date(t.currentSession.endTime).toLocaleString()} - Tổng: {t.currentSession.total} đ</p>
                )}
                <p>Trạng thái: {t.status}</p>
                <p>Giá/giờ: {t.pricePerHour ? (Number(t.pricePerHour).toLocaleString() + ' đ') : '---'}</p>
                {t.status === 'AVAILABLE' ? (
                  <button onClick={()=>reserve(t)}>Đặt bàn</button>
                ) : (
                  <button disabled>{t.status === 'RESERVED' ? 'Đã đặt' : 'Không khả dụng'}</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
