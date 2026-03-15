'use client'

import { useState } from 'react'

interface BoxRef {
  id: string
  name: string
}

interface GPU {
  id: string
  model: string
  supplier: string
  serialNumber: string
  purchaseDate: string | null
  cost: number | null
  status: string
  boxId: string | null
  box: BoxRef | null
  notes: string | null
  createdAt: string
}

interface GPUListProps {
  gpus: GPU[]
  loading: boolean
  onRefresh: () => void
  onAssignToBox?: (gpu: GPU) => void
}

const STATUS_COLORS: Record<string, string> = {
  'In Stock':  'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20',
  'In Box':    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Shipped':   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Delivered': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
  'Defective': 'text-red-400 bg-red-400/10 border-red-400/20',
}

const ALL_STATUSES = ['All', 'In Stock', 'In Box', 'Shipped', 'Delivered', 'Defective']

export default function GPUList({ gpus, loading, onRefresh, onAssignToBox }: GPUListProps) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filtered = gpus.filter(g => {
    const matchStatus = statusFilter === 'All' || g.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || g.serialNumber.toLowerCase().includes(q) || g.model.toLowerCase().includes(q) || g.supplier.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  async function handleDelete(id: string) {
    if (!confirm('Delete this GPU? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/gpu/${id}`, { method: 'DELETE' })
      onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  const totalValue = filtered.reduce((sum, g) => sum + (g.cost ?? 0), 0)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by serial, model, supplier…"
            className="w-full bg-[#0f0f0f] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/50 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30'
                  : 'text-gray-500 border border-white/5 hover:text-gray-300 hover:border-white/10'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{filtered.length} GPU{filtered.length !== 1 ? 's' : ''}</span>
          {totalValue > 0 && (
            <span>Total: <span className="text-gray-400">${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="10" rx="2" />
            <path d="M6 7V4" /><path d="M10 7V4" /><path d="M14 7V4" /><path d="M18 7V4" />
            <path d="M6 21v-4" /><path d="M10 21v-4" /><path d="M14 21v-4" /><path d="M18 21v-4" />
          </svg>
          <p className="text-sm">{search || statusFilter !== 'All' ? 'No GPUs match your filters.' : 'No GPUs added yet.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(gpu => (
            <div key={gpu.id} className="bg-[#141414] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white font-medium text-sm">{gpu.model}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[gpu.status] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                      {gpu.status}
                    </span>
                    {gpu.box && (
                      <span className="text-[10px] text-blue-400/70 bg-blue-400/5 border border-blue-400/10 px-2 py-0.5 rounded-full">
                        {gpu.box.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span className="font-mono text-gray-400">{gpu.serialNumber}</span>
                    <span>{gpu.supplier}</span>
                    {gpu.cost !== null && <span className="text-[#00ff88]/70">${gpu.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                    {gpu.purchaseDate && <span>{new Date(gpu.purchaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                  </div>
                  {gpu.notes && <p className="text-xs text-gray-600 mt-1 truncate">{gpu.notes}</p>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onAssignToBox && gpu.status === 'In Stock' && (
                    <button
                      onClick={() => onAssignToBox(gpu)}
                      title="Add to box"
                      className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-400/10"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(gpu.id)}
                    disabled={deletingId === gpu.id}
                    title="Delete GPU"
                    className="w-7 h-7 flex items-center justify-center text-gray-700 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10 disabled:opacity-40"
                  >
                    {deletingId === gpu.id ? (
                      <span className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
