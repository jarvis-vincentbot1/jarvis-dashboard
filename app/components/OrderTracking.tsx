'use client'

import { useState } from 'react'

interface GPU {
  id: string
  serialNumber: string
  supplier: string
  status: 'received' | 'in_box' | 'shipped' | 'delivered'
  dateAdded: string
}

interface Box {
  id: string
  gpus: string[]
  weight?: number
  dimensions?: string
  trackingNumber?: string
  dateCreated: string
}

export default function OrderTracking() {
  const [gpus, setGpus] = useState<GPU[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])
  const [serialInput, setSerialInput] = useState('')
  const [supplierInput, setSupplierInput] = useState('Megekko')
  const [customSupplier, setCustomSupplier] = useState('')
  const [suppliers, setSuppliers] = useState(['Megekko', 'Paradigit', 'Coolblue', 'Amazon', 'Alternate', 'MediaMarkt', 'Bol', 'Cyberport'])
  const [currentBox, setCurrentBox] = useState<string | null>(null)

  const addSupplier = () => {
    if (customSupplier.trim() && !suppliers.includes(customSupplier)) {
      setSuppliers([...suppliers, customSupplier])
      setSupplierInput(customSupplier)
      setCustomSupplier('')
    }
  }

  const addGPU = () => {
    if (!serialInput.trim()) return
    const newGPU: GPU = {
      id: Math.random().toString(36).slice(2, 9),
      serialNumber: serialInput,
      supplier: supplierInput,
      status: 'received',
      dateAdded: new Date().toLocaleDateString(),
    }
    setGpus([...gpus, newGPU])
    setSerialInput('')
  }

  const createBox = () => {
    const newBox: Box = {
      id: `BOX-${Date.now()}`,
      gpus: [],
      dateCreated: new Date().toLocaleDateString(),
    }
    setBoxes([...boxes, newBox])
    setCurrentBox(newBox.id)
  }

  const addGPUToBox = (gpuId: string) => {
    if (!currentBox) return
    setBoxes(boxes.map(b => 
      b.id === currentBox ? { ...b, gpus: [...b.gpus, gpuId] } : b
    ))
    setGpus(gpus.map(g => 
      g.id === gpuId ? { ...g, status: 'in_box' } : g
    ))
  }

  const exportBox = (boxId: string) => {
    const box = boxes.find(b => b.id === boxId)
    if (!box) return
    const content = box.gpus
      .map(gpuId => {
        const gpu = gpus.find(g => g.id === gpuId)
        return `${box.id},${gpu?.serialNumber},${gpu?.supplier}`
      })
      .join('\n')
    
    const csv = `Box ID,Serial Number,Supplier\n${content}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${box.id}.csv`
    a.click()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">Order Tracking</h1>

      {/* Quick Scan */}
      <div className="bg-[#141414] border border-[#00ff88]/20 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-white text-lg font-semibold mb-4">Scan GPU Serial</h2>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Scan or type serial number"
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addGPU()}
              className="flex-1 min-w-48 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-[#00ff88]"
              autoFocus
            />
            <select
              value={supplierInput}
              onChange={(e) => setSupplierInput(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-gray-100 focus:outline-none focus:border-[#00ff88]"
            >
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={addGPU}
              className="bg-[#00ff88] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#00dd77]"
            >
              Add
            </button>
          </div>
        </div>

        {/* Add new supplier */}
        <div className="border-t border-[#00ff88]/10 pt-4">
          <h3 className="text-gray-300 text-sm font-semibold mb-3">Add New Supplier</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Supplier name"
              value={customSupplier}
              onChange={(e) => setCustomSupplier(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addSupplier()}
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-2 text-gray-100 text-sm focus:outline-none focus:border-[#00ff88]"
            />
            <button
              onClick={addSupplier}
              className="bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-[#00d4ff] px-4 py-2 rounded-lg text-sm font-medium"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Inventory */}
        <div className="bg-[#141414] border border-white/5 rounded-xl p-6">
          <h2 className="text-white text-lg font-semibold mb-4">Inventory ({gpus.length})</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {gpus.map(gpu => (
              <div key={gpu.id} className="bg-[#0a0a0a] border border-white/10 rounded p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="text-gray-300 font-mono">{gpu.serialNumber}</p>
                  <p className="text-gray-600 text-xs">{gpu.supplier} • {gpu.dateAdded}</p>
                </div>
                {currentBox && gpu.status === 'received' && (
                  <button
                    onClick={() => addGPUToBox(gpu.id)}
                    className="bg-[#00ff88]/20 hover:bg-[#00ff88]/30 text-[#00ff88] px-3 py-1 rounded text-xs"
                  >
                    Add
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Boxes */}
        <div className="bg-[#141414] border border-white/5 rounded-xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-white text-lg font-semibold">Boxes ({boxes.length})</h2>
            <button
              onClick={createBox}
              className="bg-[#00ff88]/20 hover:bg-[#00ff88]/30 text-[#00ff88] px-4 py-2 rounded text-sm"
            >
              New Box
            </button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {boxes.map(box => (
              <div key={box.id} className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-mono text-sm">{box.id}</p>
                    <p className="text-gray-600 text-xs">{box.gpus.length} GPUs • {box.dateCreated}</p>
                  </div>
                  <button
                    onClick={() => exportBox(box.id)}
                    className="bg-[#00d4ff]/20 hover:bg-[#00d4ff]/30 text-[#00d4ff] px-3 py-1 rounded text-xs"
                  >
                    Export
                  </button>
                </div>
                {currentBox === box.id && (
                  <div className="text-xs text-[#00ff88]">← Packing this box</div>
                )}
                {box.gpus.length > 0 && (
                  <div className="text-xs text-gray-500 space-y-1">
                    {box.gpus.slice(0, 3).map(gpuId => {
                      const gpu = gpus.find(g => g.id === gpuId)
                      return <p key={gpuId}>{gpu?.serialNumber} ({gpu?.supplier})</p>
                    })}
                    {box.gpus.length > 3 && <p>+{box.gpus.length - 3} more</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
