'use client'

import { useState } from 'react'
import PriceTracker from './PriceTracker'
import GPUInventory from './GPUInventory'
import TrustedSuppliers from './TrustedSuppliers'

type TabId = 'search' | 'inventory' | 'suppliers'

interface TabConfig {
  id: TabId
  label: string
  icon: React.ReactNode
  description: string
}

const TABS: TabConfig[] = [
  {
    id: 'search',
    label: 'Hardware Search',
    icon: '🔍',
    description: 'Search and track hardware prices',
  },
  {
    id: 'inventory',
    label: 'My Inventory',
    icon: '📦',
    description: 'Manage your GPU collection',
  },
  {
    id: 'suppliers',
    label: 'Trusted Suppliers',
    icon: '🏪',
    description: 'Monitor RTX 5090 suppliers',
  },
]

export default function ProductResearch() {
  const [activeTab, setActiveTab] = useState<TabId>('search')

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header with description */}
      <div className="px-4 md:px-6 py-4 border-b border-white/5 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Product Research</h1>
        <p className="text-sm text-gray-400">
          Search hardware, manage your inventory, and monitor trusted suppliers
        </p>
      </div>

      {/* Tab navigation */}
      <div className="px-4 md:px-6 py-3 border-b border-white/5 flex-shrink-0 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30'
                  : 'text-gray-400 hover:text-gray-200 border border-transparent hover:border-white/10'
              }`}
              title={tab.description}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'search' && <PriceTracker />}
        {activeTab === 'inventory' && <GPUInventory />}
        {activeTab === 'suppliers' && <TrustedSuppliers />}
      </div>
    </div>
  )
}
