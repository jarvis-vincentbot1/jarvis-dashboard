'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import GPUForm from './GPUForm'
import GPUList from './GPUList'
import BoxManager from './BoxManager'

interface BoxRef { id: string; name: string }

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

interface Box {
  id: string
  name: string
  destination: string | null
  status: string
  notes: string | null
  gpus: { id: string; model: string; serialNumber: string; cost: number | null; status: string }[]
  createdAt: string
  updatedAt: string
}

type Tab = 'overview' | 'gpus' | 'boxes' | 'add'

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-xl p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? 'text-[#00ff88]' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

export default function GPUInventory() {
  const [tab, setTab] = useState<Tab>('overview')
  const [gpus, setGpus] = useState<GPU[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [loadingGPUs, setLoadingGPUs] = useState(true)
  const [loadingBoxes, setLoadingBoxes] = useState(true)
  const [assignTarget, setAssignTarget] = useState<GPU | null>(null)
  const router = useRouter()

  const loadGPUs = useCallback(async () => {
    const res = await fetch('/api/gpu')
    if (res.status === 401) { router.push('/login'); return }
    const data = await res.json()
    setGpus(data)
  }, [router])

  const loadBoxes = useCallback(async () => {
    const res = await fetch('/api/boxes')
    if (res.status === 401) { router.push('/login'); return }
    const data = await res.json()
    setBoxes(data)
  }, [router])

  const loadAll = useCallback(async () => {
    await Promise.all([loadGPUs(), loadBoxes()])
  }, [loadGPUs, loadBoxes])

  useEffect(() => {
    Promise.all([
      loadGPUs().finally(() => setLoadingGPUs(false)),
      loadBoxes().finally(() => setLoadingBoxes(false)),
    ])
  }, [loadGPUs, loadBoxes])

  async function handleAssignToBox(boxId: string) {
    if (!assignTarget) return
    await fetch(`/api/gpu/${assignTarget.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxId, status: 'In Box' }),
    })
    setAssignTarget(null)
    await loadAll()
    setTab('boxes')
  }

  // Stats
  const totalGPUs = gpus.length
  const inStock = gpus.filter(g => g.status === 'In Stock').length
  const inBoxes = gpus.filter(g => g.status === 'In Box').length
  const shipped = gpus.filter(g => g.status === 'Shipped' || g.status === 'Delivered').length
  const totalValue = gpus.reduce((s, g) => s + (g.cost ?? 0), 0)
  const availableGPUs = gpus.filter(g => g.status === 'In Stock')

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'gpus', label: `GPUs${totalGPUs > 0 ? ` (${totalGPUs})` : ''}` },
    { id: 'boxes', label: `Boxes${boxes.length > 0 ? ` (${boxes.length})` : ''}` },
    { id: 'add', label: '+ Add GPU' },
  ]

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">GPU Inventory</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track video cards from order to shipment</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[#141414] border border-white/5 rounded-xl p-1">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setAssignTarget(null) }}
            className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              tab === id
                ? 'bg-[#00ff88]/10 text-[#00ff88]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Assign-to-box modal overlay */}
      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setAssignTarget(null)}>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="text-white font-semibold">Add to Box</h3>
              <p className="text-xs text-gray-500 mt-1">{assignTarget.model} — {assignTarget.serialNumber}</p>
            </div>
            {boxes.filter(b => b.status !== 'Shipped' && b.status !== 'Delivered').length === 0 ? (
              <p className="text-sm text-gray-500">No active boxes. Create a box first.</p>
            ) : (
              <div className="space-y-2">
                {boxes.filter(b => b.status !== 'Shipped' && b.status !== 'Delivered').map(box => (
                  <button
                    key={box.id}
                    onClick={() => handleAssignToBox(box.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#141414] border border-white/5 rounded-xl hover:border-[#00ff88]/30 hover:bg-[#00ff88]/5 transition-colors text-left"
                  >
                    <span className="text-sm text-white">{box.name}</span>
                    <span className="text-xs text-gray-500">{box.gpus.length} GPUs</span>
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setAssignTarget(null)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total GPUs" value={totalGPUs} />
            <StatCard label="In Stock" value={inStock} accent />
            <StatCard label="In Boxes" value={inBoxes} />
            <StatCard label="Shipped" value={shipped} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard
              label="Total Value"
              value={totalValue > 0 ? `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
              sub={`across ${totalGPUs} GPU${totalGPUs !== 1 ? 's' : ''}`}
              accent={totalValue > 0}
            />
            <StatCard
              label="Active Boxes"
              value={boxes.filter(b => b.status !== 'Delivered').length}
              sub={`${boxes.filter(b => b.status === 'Shipped').length} shipped, ${boxes.filter(b => b.status === 'Delivered').length} delivered`}
            />
          </div>

          {/* Recent GPUs */}
          {gpus.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-300">Recent GPUs</h2>
                <button onClick={() => setTab('gpus')} className="text-xs text-[#00ff88]/70 hover:text-[#00ff88] transition-colors">View all</button>
              </div>
              <div className="space-y-2">
                {gpus.slice(0, 5).map(gpu => (
                  <div key={gpu.id} className="flex items-center gap-3 bg-[#141414] border border-white/5 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{gpu.model}</div>
                      <div className="text-xs text-gray-500 font-mono">{gpu.serialNumber}</div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      {gpu.cost !== null && <span className="text-xs text-[#00ff88]/60 hidden sm:block">${gpu.cost.toLocaleString()}</span>}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        gpu.status === 'In Stock'  ? 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20' :
                        gpu.status === 'In Box'    ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' :
                        gpu.status === 'Shipped'   ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                        'text-gray-400 bg-gray-400/10 border-gray-400/20'
                      }`}>{gpu.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setTab('add')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#00ff88] text-black text-sm font-semibold rounded-lg hover:bg-[#00ff88]/90 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add GPU
            </button>
            <button
              onClick={() => setTab('boxes')}
              className="flex items-center gap-2 px-4 py-2.5 border border-white/10 text-gray-300 text-sm font-medium rounded-lg hover:border-white/20 hover:text-white transition-colors"
            >
              Manage Boxes
            </button>
          </div>
        </div>
      )}

      {tab === 'gpus' && (
        <GPUList
          gpus={gpus}
          loading={loadingGPUs}
          onRefresh={() => loadGPUs()}
          onAssignToBox={gpu => { setAssignTarget(gpu) }}
        />
      )}

      {tab === 'boxes' && (
        <BoxManager
          boxes={boxes}
          loading={loadingBoxes}
          onRefresh={loadAll}
          availableGPUs={availableGPUs.map(g => ({ id: g.id, model: g.model, serialNumber: g.serialNumber }))}
        />
      )}

      {tab === 'add' && (
        <div className="bg-[#141414] border border-white/5 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Add New GPU</h2>
          <GPUForm
            onCreated={async () => {
              await loadGPUs()
              setTab('gpus')
            }}
            onCancel={() => setTab('gpus')}
          />
        </div>
      )}
    </div>
  )
}
