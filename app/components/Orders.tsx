'use client'

import { useState, useEffect } from 'react'

interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  company?: string
  active: boolean
  _count?: { orders: number }
}

interface OrderItem {
  id: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  sku?: string
}

interface Order {
  id: string
  orderNumber: string
  customerId: string
  customer?: Customer
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  paymentStatus: 'unpaid' | 'paid' | 'refunded'
  subtotal: number
  tax: number
  shipping: number
  total: number
  items?: OrderItem[]
  orderDate: string
  dueDate?: string
  shippedDate?: string
  deliveryDate?: string
  notes?: string
}

type Tab = 'customers' | 'orders' | 'new-order'

export default function Orders() {
  const [tab, setTab] = useState<Tab>('orders')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  
  // Form states
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [orderItems, setOrderItems] = useState<Omit<OrderItem, 'id' | 'total'>[]>([
    { productName: '', quantity: 1, unitPrice: 0, sku: '' }
  ])

  useEffect(() => {
    if (tab === 'customers') loadCustomers()
    if (tab === 'orders') loadOrders()
  }, [tab])

  async function loadCustomers() {
    setLoading(true)
    try {
      const res = await fetch('/api/customers?active=true')
      const data = await res.json()
      setCustomers(data.data || [])
    } catch (error) {
      console.error('Failed to load customers:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadOrders() {
    setLoading(true)
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      setOrders(data.data || [])
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedCustomer || orderItems.length === 0) return

    const items = orderItems.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }))

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer,
          items,
          status: 'pending',
          paymentStatus: 'unpaid',
        }),
      })

      if (res.ok) {
        setSelectedCustomer('')
        setOrderItems([{ productName: '', quantity: 1, unitPrice: 0, sku: '' }])
        setTab('orders')
        loadOrders()
      }
    } catch (error) {
      console.error('Failed to create order:', error)
    }
  }

  function updateOrderItem(index: number, field: string, value: any) {
    const updated = [...orderItems]
    updated[index] = { ...updated[index], [field]: value }
    setOrderItems(updated)
  }

  return (
    <div className="min-h-full bg-[#0f0f0f] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-100 mb-2">Order Management</h1>
          <p className="text-gray-500">Manage customers and orders</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#2a2a2a] mb-6">
          {(['customers', 'orders', 'new-order'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-[#00ff88] text-[#00ff88]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {t === 'customers' && '👥 Customers'}
              {t === 'orders' && '📦 Orders'}
              {t === 'new-order' && '✚ New Order'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'customers' ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Customers</h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No customers yet</div>
                ) : (
                  customers.map(customer => (
                    <div
                      key={customer.id}
                      className="p-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg hover:border-[#00ff88]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-100">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{customer.email}</div>
                          {customer.company && (
                            <div className="text-xs text-gray-600">{customer.company}</div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          {customer._count?.orders || 0} orders
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : tab === 'orders' ? (
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Recent Orders</h2>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No orders yet</div>
                ) : (
                  orders.map(order => (
                    <div
                      key={order.id}
                      className="p-4 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg hover:border-[#00ff88]/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-gray-100">{order.orderNumber}</div>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                            order.status === 'shipped' ? 'bg-blue-500/20 text-blue-400' :
                            order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {order.status}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${
                            order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {order.paymentStatus}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-1">
                        {order.customer?.firstName} {order.customer?.lastName}
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-600">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </div>
                        <div className="font-medium text-[#00ff88]">
                          €{order.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={createOrder} className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-100">Create New Order</h2>
              
              {/* Customer selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded-lg text-gray-100 focus:outline-none focus:border-[#00ff88]/50"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Order items */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Items</label>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2">
                      <input
                        type="text"
                        placeholder="Product name"
                        value={item.productName}
                        onChange={(e) => updateOrderItem(idx, 'productName', e.target.value)}
                        className="px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-gray-100 text-sm focus:outline-none focus:border-[#00ff88]/50"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateOrderItem(idx, 'quantity', parseInt(e.target.value))}
                        className="px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-gray-100 text-sm focus:outline-none focus:border-[#00ff88]/50"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Unit price"
                        value={item.unitPrice}
                        onChange={(e) => updateOrderItem(idx, 'unitPrice', parseFloat(e.target.value))}
                        className="px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-gray-100 text-sm focus:outline-none focus:border-[#00ff88]/50"
                        required
                      />
                      <div className="px-3 py-2 bg-[#0f0f0f] border border-[#2a2a2a] rounded text-gray-100 text-sm flex items-center">
                        €{(item.quantity * item.unitPrice).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOrderItems([...orderItems, { productName: '', quantity: 1, unitPrice: 0, sku: '' }])}
                  className="mt-2 px-4 py-2 text-sm bg-[#00ff88]/10 border border-[#00ff88]/30 rounded text-[#00ff88] hover:bg-[#00ff88]/20 transition-colors"
                >
                  + Add item
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full px-4 py-3 bg-[#00ff88] text-[#0f0f0f] rounded-lg font-medium hover:bg-[#00ff88]/90 transition-colors"
              >
                Create Order
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
