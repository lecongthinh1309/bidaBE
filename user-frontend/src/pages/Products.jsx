import React, { useEffect, useState } from 'react'
import api from '../api/axios'
import adminApi from '../api/adminAxios'

export default function Products(){
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{ load() }, [])

  const load = async ()=>{
    try{
      setLoading(true)
      // Use adminApi to fetch via the admin frontend dev server proxy
      const res = await adminApi.get('/products?page=0&size=100')
      // if backend returns Page<Product>, res.data.content else array
      const data = res.data
      if(Array.isArray(data)) setProducts(data)
      else setProducts(data.content || [])
    }catch(err){
      console.error(err)
    }finally{ setLoading(false) }
  }

  // Cart feature removed — no-op helpers kept if needed later
  const addToCart = () => {}

  const removeFromCart = () => {}

  return (
    <div className="product-page">
      <div className="products">
        <h2>Sản phẩm</h2>
        {loading ? <p>Đang tải...</p> : (
          <div className="grid">
            {products.map(p => (
              <div key={p.id} className="card">
                {p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <div className="noimg">No image</div>}
                <h3>{p.name}</h3>
                <p className="price">{typeof p.price==='number' ? p.price.toLocaleString()+' đ' : p.price+' đ'}</p>
                <button onClick={async ()=>{
                  try{
                    const res = await api.post('/invoices/checkout', { productId: p.id, quantity: 1 })
                    const inv = res.data
                    alert('Mua thành công. Hoá đơn #' + inv.id + '\nTổng: ' + (inv.total || inv.total === 0 ? inv.total : '') )
                  }catch(err){
                    console.error(err)
                    alert('Mua không thành công')
                  }
                }}>Mua ngay</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
