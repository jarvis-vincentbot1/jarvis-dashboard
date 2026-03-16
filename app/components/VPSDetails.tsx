'use client'

import { useState, useEffect } from 'react'
import {
  Server,
  Cpu,
  HardDrive,
  Network,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Package,
} from 'lucide-react'

interface VPSData {
  vpsIp: string
  hostname: string
  status: string
  system: {
    os: string
    kernel: string
    uptime: string
    cpuCount: number
    cpuUsage: number
  }
  memory: {
    used: number
    total: number
    percent: number
    available: number
  }
  disk: {
    used: number
    total: number
    free: number
    percent: number
  }
  docker: {
    containers: number
    images: number
    diskUsage: string
  }
  security: {
    sshStatus: string
    fail2banActive: boolean
  }
  timestamp: string
}

interface Props {
  onClose?: () => void
}

const StatCard = ({ icon: Icon, label, value, unit = '', percent }: { icon: React.ComponentType<any>; label: string; value: string | number; unit?: string; percent?: number }) => (
  <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4 hover:border-[#00ff88] transition-colors">
    <div className="flex items-center gap-3 mb-2">
      <Icon className="w-5 h-5 text-[#00ff88]" />
      <span className="text-[#888888] text-sm font-medium">{label}</span>
    </div>
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold text-white">{value}</span>
      {unit && <span className="text-[#666666] text-sm">{unit}</span>}
    </div>
    {percent !== undefined && (
      <div className="mt-2 w-full bg-[#0f0f0f] rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            percent < 50 ? 'bg-[#00ff88]' : percent < 80 ? 'bg-[#ffaa00]' : 'bg-red-600'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
    )}
  </div>
)

const StatusBadge = ({ status }: { status: 'online' | 'offline' | 'unknown' }) => {
  const statusConfig = {
    online: { bg: 'bg-green-900/30', border: 'border-green-500/50', icon: CheckCircle, text: 'Online', color: 'text-green-400' },
    offline: { bg: 'bg-red-900/30', border: 'border-red-500/50', icon: AlertCircle, text: 'Offline', color: 'text-red-400' },
    unknown: { bg: 'bg-gray-900/30', border: 'border-gray-500/50', icon: AlertCircle, text: 'Unknown', color: 'text-gray-400' },
  }
  const config = statusConfig[status as 'online' | 'offline' | 'unknown']
  const Icon = config.icon
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${config.bg} ${config.border} w-fit`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{config.text}</span>
    </div>
  )
}

const SectionTitle = ({ icon: Icon, title }: { icon: React.ComponentType<any>; title: string }) => (
  <div className="flex items-center gap-3 mb-4 pt-4">
    <Icon className="w-5 h-5 text-[#00ff88]" />
    <h3 className="text-lg font-semibold text-white">{title}</h3>
  </div>
)

export default function VPSDetails({ onClose }: Props) {
  const [data, setData] = useState<VPSData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchVPSDetails = async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/vps/details')
      if (!res.ok) throw new Error('Failed to fetch VPS details')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchVPSDetails()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchVPSDetails, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#888888]">Loading VPS details...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-medium">{error || 'Failed to load VPS details'}</p>
          <button
            onClick={fetchVPSDetails}
            className="mt-4 px-4 py-2 bg-[#1a1a1a] border border-[#00ff88] text-[#00ff88] rounded-lg hover:bg-[#00ff88] hover:text-black transition-colors text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-h-[90vh] overflow-y-auto bg-[#0f0f0f]">
      {/* Header */}
      <div className="sticky top-0 bg-[#0f0f0f] border-b border-[#333333] p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-[#00ff88]" />
            <div>
              <h2 className="text-2xl font-bold text-white">{data.hostname}</h2>
              <p className="text-[#666666] text-sm">{data.vpsIp}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={data.status as 'online' | 'offline'} />
            <button
              onClick={fetchVPSDetails}
              disabled={refreshing}
              className="p-2 bg-[#1a1a1a] border border-[#333333] rounded-lg hover:border-[#00ff88] hover:bg-[#1a1a1a] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 text-[#00ff88] ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] rounded-lg hover:border-red-500 text-[#888888] hover:text-red-400 transition-colors text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-[#666666]">Last updated: {new Date(data.timestamp).toLocaleTimeString()}</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* System Info */}
        <div>
          <SectionTitle icon={Server} title="System Information" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard icon={Package} label="OS" value={data.system.os.split(' ')[0]} unit="" />
            <StatCard icon={Package} label="Kernel" value={data.system.kernel} unit="" />
            <StatCard icon={Package} label="Uptime" value={data.system.uptime} unit="" />
            <StatCard icon={Package} label="CPU Cores" value={data.system.cpuCount} unit="" />
          </div>
        </div>

        {/* CPU */}
        <div>
          <SectionTitle icon={Cpu} title="CPU" />
          <div className="grid grid-cols-1 gap-4">
            <StatCard
              icon={Cpu}
              label="CPU Usage"
              value={data.system.cpuUsage}
              unit="%"
              percent={data.system.cpuUsage}
            />
          </div>
        </div>

        {/* Memory */}
        <div>
          <SectionTitle icon={HardDrive} title="Memory (RAM)" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={HardDrive}
              label="Used"
              value={data.memory.used}
              unit="GB"
            />
            <StatCard
              icon={HardDrive}
              label="Total"
              value={data.memory.total}
              unit="GB"
            />
            <StatCard
              icon={HardDrive}
              label="Available"
              value={data.memory.available}
              unit="GB"
            />
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <p className="text-[#888888] text-sm font-medium mb-2">Usage</p>
              <p className="text-2xl font-bold text-white mb-2">{data.memory.percent}%</p>
              <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    data.memory.percent < 50 ? 'bg-[#00ff88]' : data.memory.percent < 80 ? 'bg-[#ffaa00]' : 'bg-red-600'
                  }`}
                  style={{ width: `${data.memory.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Disk */}
        <div>
          <SectionTitle icon={HardDrive} title="Storage (Disk)" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={HardDrive}
              label="Used"
              value={data.disk.used}
              unit="GB"
            />
            <StatCard
              icon={HardDrive}
              label="Total"
              value={data.disk.total}
              unit="GB"
            />
            <StatCard
              icon={HardDrive}
              label="Free"
              value={data.disk.free}
              unit="GB"
            />
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <p className="text-[#888888] text-sm font-medium mb-2">Usage</p>
              <p className="text-2xl font-bold text-white mb-2">{data.disk.percent}%</p>
              <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all ${
                    data.disk.percent < 50 ? 'bg-[#00ff88]' : data.disk.percent < 80 ? 'bg-[#ffaa00]' : 'bg-red-600'
                  }`}
                  style={{ width: `${data.disk.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Docker */}
        <div>
          <SectionTitle icon={Package} title="Docker" />
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={Package} label="Containers" value={data.docker.containers} unit="" />
            <StatCard icon={Package} label="Images" value={data.docker.images} unit="" />
            <StatCard icon={Package} label="Disk Usage" value={data.docker.diskUsage} unit="" />
          </div>
        </div>

        {/* Network */}
        <div>
          <SectionTitle icon={Network} title="Network" />
          <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Network className="w-5 h-5 text-[#00ff88]" />
                <span className="text-[#888888] text-sm font-medium">IP Address</span>
              </div>
              <span className="text-white font-mono">{data.vpsIp}</span>
            </div>
          </div>
        </div>

        {/* Security */}
        <div>
          <SectionTitle icon={Shield} title="Security" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00ff88]" />
                  <span className="text-[#888888] text-sm font-medium">SSH Status</span>
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded ${
                    data.security.sshStatus === 'Running'
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-red-900/30 text-red-400'
                  }`}
                >
                  {data.security.sshStatus}
                </span>
              </div>
            </div>
            <div className="bg-[#1a1a1a] border border-[#333333] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00ff88]" />
                  <span className="text-[#888888] text-sm font-medium">Fail2Ban</span>
                </div>
                <span
                  className={`text-sm font-medium px-2 py-1 rounded ${
                    data.security.fail2banActive
                      ? 'bg-green-900/30 text-green-400'
                      : 'bg-gray-900/30 text-gray-400'
                  }`}
                >
                  {data.security.fail2banActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
