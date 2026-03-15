'use client'

import { useState } from 'react'

interface GPUSummary {
  id: string
  model: string
  serialNumber: string
  cost: number | null
  status: string
}

interface Box {
  id: string
  name: string
  destination: string | null
  status: string
  notes: string | null
  gpus: GPUSummary[]
  createdAt: string
  updatedAt: string
}

interface BoxManagerProps {
  boxes: Box[]
  loading: boolean
  onRefresh: () => void
  availableGPUs: { id: string; model: string; serialNumber: string }[]
}

const BOX_STATUS_COLORS: Record<string, string> = {
  'Packing':   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  'Ready':     'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Shipped':   'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Delivered': 'text-[#00ff88] bg-[#00ff88]/10 border-[#00ff88]/20',
}

const BOX_STATUSES = ['Packing', 'Ready', 'Shipped', 'Delivered']

export default function BoxManager({ boxes, loading, onRefresh, availableGPUs }: BoxManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedBox, setSelectedBox] = useState<Box | null>(null)
  const [newBoxName, setNewBoxName] = useState('')
  const [newBoxDest, setNewBoxDest] = useState('')
  const [newBoxStatus, setNewBoxStatus] = useState('Packing')
  const [newBoxNotes, setNewBoxNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [addingGPUID, setAddingGPUID] = useState('')
  const [addingToBox, setAddingToBox] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [removeGPUID, setRemoveGPUID] = useState<string | null>(null)
  const [createError, setCreateError] = useState('')

  async function handleCreateBox(e: React.FormEvent) {
    e.preventDefault()
    if (!newBoxName.trim()) return
    setCreating(true)
    setCreateError('')
    try {
      const res = await fetch('/api/boxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBoxName.trim(), destination: newBoxDest, status: newBoxStatus, notes: newBoxNotes }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed')
      }
      setNewBoxName('')
      setNewBoxDest('')
      setNewBoxStatus('Packing')
      setNewBoxNotes('')
      setShowCreateForm(false)
      onRefresh()
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Error creating box')
    } finally {
      setCreating(false)
    }
  }

  async function handleAddGPUToBox() {
    if (!selectedBox || !addingGPUID) return
    setAddingToBox(true)
    try {
      await fetch(`/api/gpu/${addingGPUID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId: selectedBox.id, status: 'In Box' }),
      })
      setAddingGPUID('')
      onRefresh()
      // Update selected box view
      const updated = await fetch(`/api/boxes/${selectedBox.id}`).then(r => r.json())
      setSelectedBox(updated)
    } finally {
      setAddingToBox(false)
    }
  }

  async function handleRemoveGPUFromBox(gpuId: string) {
    setRemoveGPUID(gpuId)
    try {
      await fetch(`/api/gpu/${gpuId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId: null, status: 'In Stock' }),
      })
      onRefresh()
      if (selectedBox) {
        const updated = await fetch(`/api/boxes/${selectedBox.id}`).then(r => r.json())
        setSelectedBox(updated)
      }
    } finally {
      setRemoveGPUID(null)
    }
  }

  async function handleUpdateBoxStatus(status: string) {
    if (!selectedBox) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/boxes/${selectedBox.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const updated = await res.json()
      setSelectedBox(updated)
      onRefresh()
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleDeleteBox(id: string) {
    if (!confirm('Delete this box? GPUs will be returned to stock.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/boxes/${id}`, { method: 'DELETE' })
      if (selectedBox?.id === id) setSelectedBox(null)
      onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  function handleExportCSV(box: Box) {
    window.location.href = `/api/boxes/${box.id}/export`
  }

  const inputCls = 'w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/50 transition-colors'

  // Detail view
  if (selectedBox) {
    const boxInList = boxes.find(b => b.id === selectedBox.id)
    const displayBox = boxInList ?? selectedBox
    const boxValue = displayBox.gpus.reduce((s, g) => s + (g.cost ?? 0), 0)

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedBox(null)}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-lg transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base truncate">{displayBox.name}</h3>
            {displayBox.destination && <p className="text-xs text-gray-500 truncate">{displayBox.destination}</p>}
          </div>
          <button
            onClick={() => handleExportCSV(displayBox)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 border border-white/10 rounded-lg hover:text-white hover:border-white/20 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            CSV
          </button>
        </div>

        {/* Box status */}
        <div className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${BOX_STATUS_COLORS[displayBox.status] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                {displayBox.status}
              </span>
              <span className="text-sm text-gray-500">{displayBox.gpus.length} GPU{displayBox.gpus.length !== 1 ? 's' : ''}</span>
              {boxValue > 0 && <span className="text-sm text-[#00ff88]/70">${boxValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
            </div>
            <div className="flex gap-1.5">
              {BOX_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleUpdateBoxStatus(s)}
                  disabled={updatingStatus || displayBox.status === s}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors disabled:opacity-40 ${
                    displayBox.status === s
                      ? 'text-white border-white/20 bg-white/5'
                      : 'text-gray-500 border-white/5 hover:text-gray-300 hover:border-white/15'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {displayBox.notes && <p className="text-xs text-gray-500">{displayBox.notes}</p>}
        </div>

        {/* Add GPU to box */}
        {availableGPUs.length > 0 && (
          <div className="flex gap-2">
            <select
              value={addingGPUID}
              onChange={e => setAddingGPUID(e.target.value)}
              className="flex-1 bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00ff88]/50 transition-colors"
            >
              <option value="">Add GPU to this box…</option>
              {availableGPUs.map(g => (
                <option key={g.id} value={g.id}>{g.model} — {g.serialNumber}</option>
              ))}
            </select>
            <button
              onClick={handleAddGPUToBox}
              disabled={!addingGPUID || addingToBox}
              className="px-4 py-2 bg-[#00ff88] text-black text-sm font-semibold rounded-lg hover:bg-[#00ff88]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {addingToBox ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Add'}
            </button>
          </div>
        )}

        {/* GPU list */}
        {displayBox.gpus.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-600">No GPUs in this box yet.</p>
        ) : (
          <div className="space-y-2">
            {displayBox.gpus.map(gpu => (
              <div key={gpu.id} className="flex items-center gap-3 bg-[#141414] border border-white/5 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{gpu.model}</div>
                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                    <span className="font-mono text-gray-400">{gpu.serialNumber}</span>
                    {gpu.cost !== null && <span className="text-[#00ff88]/70">${gpu.cost.toLocaleString()}</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveGPUFromBox(gpu.id)}
                  disabled={removeGPUID === gpu.id}
                  title="Remove from box"
                  className="w-7 h-7 flex items-center justify-center text-gray-700 hover:text-orange-400 transition-colors rounded-lg hover:bg-orange-400/10 disabled:opacity-40"
                >
                  {removeGPUID === gpu.id ? (
                    <span className="w-3.5 h-3.5 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Box list view
  return (
    <div className="space-y-4">
      {/* Create box button */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#00ff88] text-black text-sm font-semibold rounded-lg hover:bg-[#00ff88]/90 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Box
        </button>
      ) : (
        <form onSubmit={handleCreateBox} className="bg-[#141414] border border-white/5 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-white">Create New Box</h4>
          {createError && <p className="text-xs text-red-400">{createError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Box Name *</label>
              <input type="text" value={newBoxName} onChange={e => setNewBoxName(e.target.value)} placeholder="e.g. Box #1, Batch March" className={inputCls} required autoFocus />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Destination / Address</label>
              <input type="text" value={newBoxDest} onChange={e => setNewBoxDest(e.target.value)} placeholder="Shipping address or location" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Status</label>
              <select value={newBoxStatus} onChange={e => setNewBoxStatus(e.target.value)} className={inputCls}>
                {BOX_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wide">Notes</label>
              <input type="text" value={newBoxNotes} onChange={e => setNewBoxNotes(e.target.value)} placeholder="Optional notes" className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="flex items-center gap-2 px-5 py-2 bg-[#00ff88] text-black text-sm font-semibold rounded-lg hover:bg-[#00ff88]/90 disabled:opacity-50 transition-colors">
              {creating ? <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : null}
              {creating ? 'Creating…' : 'Create Box'}
            </button>
            <button type="button" onClick={() => { setShowCreateForm(false); setCreateError('') }} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Box list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : boxes.length === 0 ? (
        <div className="text-center py-12 text-gray-600">
          <svg className="mx-auto mb-3 opacity-30" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <p className="text-sm">No boxes created yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {boxes.map(box => {
            const boxValue = box.gpus.reduce((s, g) => s + (g.cost ?? 0), 0)
            return (
              <div key={box.id} className="bg-[#141414] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors">
                <div className="flex items-start gap-3">
                  <button onClick={() => setSelectedBox(box)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-white font-medium text-sm">{box.name}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${BOX_STATUS_COLORS[box.status] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                        {box.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      <span>{box.gpus.length} GPU{box.gpus.length !== 1 ? 's' : ''}</span>
                      {boxValue > 0 && <span className="text-[#00ff88]/70">${boxValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>}
                      {box.destination && <span className="truncate max-w-[200px]">{box.destination}</span>}
                    </div>
                    {box.gpus.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {box.gpus.slice(0, 4).map(g => (
                          <span key={g.id} className="text-[10px] font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{g.serialNumber}</span>
                        ))}
                        {box.gpus.length > 4 && <span className="text-[10px] text-gray-600">+{box.gpus.length - 4} more</span>}
                      </div>
                    )}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleExportCSV(box)}
                      title="Export CSV"
                      className="w-7 h-7 flex items-center justify-center text-gray-700 hover:text-[#00ff88] transition-colors rounded-lg hover:bg-[#00ff88]/10"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteBox(box.id)}
                      disabled={deletingId === box.id}
                      title="Delete box"
                      className="w-7 h-7 flex items-center justify-center text-gray-700 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10 disabled:opacity-40"
                    >
                      {deletingId === box.id ? (
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
            )
          })}
        </div>
      )}
    </div>
  )
}
