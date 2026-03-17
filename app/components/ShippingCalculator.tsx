'use client'

import { useState } from 'react'

interface ShippingRate {
  base: number
  perKg: number
}

interface CountryRates {
  [carrier: string]: ShippingRate
}

interface ShippingRates {
  [country: string]: CountryRates
}

const SHIPPING_RATES: ShippingRates = {
  'Germany': {
    'DHL': { base: 5, perKg: 0.50 },
    'UPS': { base: 6, perKg: 0.60 },
    'GLS': { base: 3, perKg: 0.40 },
    'FedEx': { base: 8, perKg: 0.70 },
  },
  'UK': {
    'DHL': { base: 7, perKg: 0.55 },
    'UPS': { base: 8, perKg: 0.65 },
    'GLS': { base: 5, perKg: 0.45 },
    'FedEx': { base: 10, perKg: 0.75 },
  },
  'France': {
    'DHL': { base: 5, perKg: 0.50 },
    'UPS': { base: 6, perKg: 0.60 },
    'GLS': { base: 3, perKg: 0.40 },
    'FedEx': { base: 8, perKg: 0.70 },
  },
  'Netherlands': {
    'DHL': { base: 4, perKg: 0.45 },
    'UPS': { base: 5, perKg: 0.55 },
    'GLS': { base: 2.50, perKg: 0.35 },
    'FedEx': { base: 7, perKg: 0.65 },
  },
  'USA': {
    'DHL': { base: 12, perKg: 0.80 },
    'UPS': { base: 14, perKg: 0.90 },
    'GLS': { base: 10, perKg: 0.70 },
    'FedEx': { base: 16, perKg: 1.00 },
  },
  'Hong Kong': {
    'DHL': { base: 15, perKg: 2.00 },
    'UPS': { base: 18, perKg: 2.50 },
    'GLS': { base: 12, perKg: 1.80 },
    'FedEx': { base: 20, perKg: 2.80 },
  },
  'China': {
    'DHL': { base: 14, perKg: 1.90 },
    'UPS': { base: 17, perKg: 2.40 },
    'GLS': { base: 11, perKg: 1.70 },
    'FedEx': { base: 19, perKg: 2.70 },
  },
  'Japan': {
    'DHL': { base: 16, perKg: 2.10 },
    'UPS': { base: 19, perKg: 2.60 },
    'GLS': { base: 13, perKg: 1.90 },
    'FedEx': { base: 22, perKg: 3.00 },
  },
  'Singapore': {
    'DHL': { base: 14, perKg: 1.95 },
    'UPS': { base: 17, perKg: 2.45 },
    'GLS': { base: 12, perKg: 1.75 },
    'FedEx': { base: 19, perKg: 2.75 },
  },
  'Australia': {
    'DHL': { base: 20, perKg: 2.50 },
    'UPS': { base: 23, perKg: 3.00 },
    'GLS': { base: 18, perKg: 2.30 },
    'FedEx': { base: 26, perKg: 3.50 },
  },
}

const COUNTRIES = Object.keys(SHIPPING_RATES)
const CARRIERS = ['DHL', 'UPS', 'GLS', 'FedEx']

export default function ShippingCalculator() {
  const [productCost, setProductCost] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')
  const [weight, setWeight] = useState('')
  const [country, setCountry] = useState('Germany')
  const [selectedCarrier, setSelectedCarrier] = useState('DHL')
  const [useCustomShipping, setUseCustomShipping] = useState(false)
  const [customShippingCost, setCustomShippingCost] = useState('')

  const productCostNum = parseFloat(productCost) || 0
  const sellingPriceNum = parseFloat(sellingPrice) || 0
  const weightNum = parseFloat(weight) || 0

  // Calculate shipping cost
  let shippingCost = 0
  if (useCustomShipping) {
    shippingCost = parseFloat(customShippingCost) || 0
  } else {
    const rates = SHIPPING_RATES[country][selectedCarrier]
    shippingCost = rates.base + rates.perKg * weightNum
  }

  const totalCost = productCostNum + shippingCost
  const profit = sellingPriceNum - totalCost
  const profitMargin = sellingPriceNum > 0 ? (profit / sellingPriceNum) * 100 : 0
  const isProfit = profit > 0

  const handleReset = () => {
    setProductCost('')
    setSellingPrice('')
    setWeight('')
    setCountry('Germany')
    setSelectedCarrier('DHL')
    setUseCustomShipping(false)
    setCustomShippingCost('')
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-[#00ff88]/20">
      <h2 className="text-2xl font-bold text-[#00ff88] mb-6">Shipping Cost Calculator</h2>

      {/* Inputs */}
      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Product Cost (€)</label>
            <input
              type="number"
              value={productCost}
              onChange={(e) => setProductCost(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#00ff88]/30 rounded text-white focus:outline-none focus:border-[#00ff88]"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Selling Price (€)</label>
            <input
              type="number"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#00ff88]/30 rounded text-white focus:outline-none focus:border-[#00ff88]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#00ff88]/30 rounded text-white focus:outline-none focus:border-[#00ff88]"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Destination Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 bg-[#1a1a1a] border border-[#00ff88]/30 rounded text-white focus:outline-none focus:border-[#00ff88]"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Shipping Toggle */}
        <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] border border-[#00ff88]/20 rounded">
          <input
            type="checkbox"
            id="customShipping"
            checked={useCustomShipping}
            onChange={(e) => setUseCustomShipping(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="customShipping" className="text-sm text-gray-400 cursor-pointer">
            Use Custom Shipping Cost
          </label>
          {useCustomShipping && (
            <input
              type="number"
              value={customShippingCost}
              onChange={(e) => setCustomShippingCost(e.target.value)}
              placeholder="0.00"
              className="ml-auto px-3 py-1 bg-[#0f0f0f] border border-[#00ff88]/30 rounded text-white text-sm focus:outline-none focus:border-[#00ff88]"
            />
          )}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-[#1a1a1a] border border-[#00ff88]/20 rounded p-4 mb-6">
        <h3 className="text-[#00ff88] font-semibold mb-3">Cost Breakdown</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Product Cost:</span>
            <span className="text-white">€{productCostNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Shipping Cost:</span>
            <span className="text-white">€{shippingCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between border-t border-[#00ff88]/20 pt-2 font-semibold">
            <span className="text-[#00ff88]">Total Cost:</span>
            <span className="text-[#00ff88]">€{totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Profit Analysis */}
      <div className={`${isProfit ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'} border rounded p-4 mb-6`}>
        <h3 className={`${isProfit ? 'text-green-400' : 'text-red-400'} font-semibold mb-3`}>
          Profit Analysis
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Selling Price:</span>
            <span className="text-white">€{sellingPriceNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Cost:</span>
            <span className="text-white">€{totalCost.toFixed(2)}</span>
          </div>
          <div className={`flex justify-between border-t ${isProfit ? 'border-green-500/30' : 'border-red-500/30'} pt-2 font-semibold`}>
            <span className={isProfit ? 'text-green-400' : 'text-red-400'}>
              {isProfit ? 'Profit' : 'Loss'}:
            </span>
            <span className={isProfit ? 'text-green-400' : 'text-red-400'}>
              €{Math.abs(profit).toFixed(2)} ({profitMargin.toFixed(1)}%)
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Break-Even Price:</span>
            <span>€{totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Carrier Selection */}
      {!useCustomShipping && (
        <div className="bg-[#1a1a1a] border border-[#00ff88]/20 rounded p-4 mb-6">
          <h3 className="text-[#00ff88] font-semibold mb-3">Select Carrier</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CARRIERS.map((carrier) => {
              const rates = SHIPPING_RATES[country][carrier]
              const cost = rates.base + rates.perKg * weightNum
              return (
                <button
                  key={carrier}
                  onClick={() => setSelectedCarrier(carrier)}
                  className={`p-3 rounded text-sm font-semibold transition ${
                    selectedCarrier === carrier
                      ? 'bg-[#00ff88] text-[#0f0f0f]'
                      : 'bg-[#0f0f0f] border border-[#00ff88]/30 text-[#00ff88] hover:border-[#00ff88]'
                  }`}
                >
                  <div>{carrier}</div>
                  <div className="text-xs mt-1 opacity-75">€{cost.toFixed(2)}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="w-full py-2 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] rounded font-semibold hover:bg-[#00ff88]/20 transition"
      >
        Reset
      </button>
    </div>
  )
}
