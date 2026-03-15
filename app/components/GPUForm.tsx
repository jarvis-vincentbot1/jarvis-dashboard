'use client'

import { useState } from 'react'

interface GPUFormProps {
  onCreated: () => void
  onCancel?: () => void
}

const GPU_MODELS = [
  'RTX 5090', 'RTX 5080', 'RTX 5070 Ti', 'RTX 5070',
  'RTX 4090', 'RTX 4080 Super', 'RTX 4080', 'RTX 4070 Ti Super', 'RTX 4070 Ti',
  'RTX 4070 Super', 'RTX 4070', 'RTX 3090 Ti', 'RTX 3090', 'RTX 3080 Ti', 'RTX 3080',
  'RX 9070 XT', 'RX 9070', 'RX 7900 XTX', 'RX 7900 XT', 'RX 7800 XT',
  'Other',
]

const GPU_STATUSES = ['In Stock', 'In Box', 'Shipped', 'Delivered', 'Defective']

export default function GPUForm({ onCreated, onCancel }: GPUFormProps) {
  const [model, setModel] = useState('')
  const [customModel, setCustomModel] = useState('')
  const [supplier, setSupplier] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [cost, setCost] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [status, setStatus] = useState('In Stock')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const effectiveModel = model === 'Other' ? customModel : model

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveModel.trim() || !supplier.trim() || !serialNumber.trim()) {
      setError('Model, supplier, and serial number are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/gpu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: effectiveModel.trim(),
          supplier: supplier.trim(),
          serialNumber: serialNumber.trim(),
          cost: cost || undefined,
          purchaseDate: purchaseDate || undefined,
          status,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add GPU')
      }
      // Reset form
      setModel('')
      setCustomModel('')
      setSupplier('')
      setSerialNumber('')
      setCost('')
      setPurchaseDate('')
      setStatus('In Stock')
      setNotes('')
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error adding GPU')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#00ff88]/50 transition-colors'
  const labelCls = 'block text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>GPU Model *</label>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className={inputCls}
            required
          >
            <option value="">Select model…</option>
            {GPU_MODELS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {model === 'Other' && (
            <input
              type="text"
              value={customModel}
              onChange={e => setCustomModel(e.target.value)}
              placeholder="Enter model name"
              className={`${inputCls} mt-2`}
              required
            />
          )}
        </div>

        <div>
          <label className={labelCls}>Supplier / Source *</label>
          <input
            type="text"
            value={supplier}
            onChange={e => setSupplier(e.target.value)}
            placeholder="e.g. Newegg, Amazon, B&H"
            className={inputCls}
            required
          />
        </div>

        <div>
          <label className={labelCls}>Serial Number *</label>
          <input
            type="text"
            value={serialNumber}
            onChange={e => setSerialNumber(e.target.value)}
            placeholder="e.g. SN123456789"
            className={inputCls}
            required
            autoCapitalize="characters"
          />
        </div>

        <div>
          <label className={labelCls}>Cost (USD)</label>
          <input
            type="number"
            value={cost}
            onChange={e => setCost(e.target.value)}
            placeholder="e.g. 1999.99"
            min="0"
            step="0.01"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Purchase Date</label>
          <input
            type="date"
            value={purchaseDate}
            onChange={e => setPurchaseDate(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className={inputCls}
          >
            {GPU_STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any notes about this GPU…"
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-[#00ff88] text-black text-sm font-semibold rounded-lg hover:bg-[#00ff88]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
          {saving ? 'Adding…' : 'Add GPU'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
