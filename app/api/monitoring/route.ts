import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const HOSTS = [
  { name: 'VPS (212.192.243.78)', base: 'http://212.192.243.78:19999/api/v1' },
  { name: 'Mac mini', base: 'http://100.116.130.111:19999/api/v1' },
]

async function fetchNetdata(base: string, path: string): Promise<unknown> {
  const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

function extractLatestValue(data: unknown): number {
  // Netdata /api/v1/data returns { data: [[timestamp, val1, val2, ...]], ... }
  const d = data as { data?: number[][] }
  return d?.data?.[0]?.[1] ?? 0
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)} days`
}

async function fetchHostMetrics(host: { name: string; base: string }) {
  try {
    const [cpuData, ramData, diskData, uptimeData] = await Promise.all([
      fetchNetdata(host.base, '/data?chart=system.cpu&points=1&after=-1'),
      fetchNetdata(host.base, '/data?chart=system.ram&points=1&after=-1'),
      fetchNetdata(host.base, '/data?chart=disk_space./&points=1&after=-1'),
      fetchNetdata(host.base, '/data?chart=system.uptime&points=1&after=-1'),
    ])

    // CPU: Netdata v2 reports usage directly (no idle dimension) — sum all values
    const cpuRaw = cpuData as { data?: number[][], labels?: string[] }
    let cpu = 0
    if (cpuRaw?.data?.[0]) {
      const vals = cpuRaw.data[0].slice(1) // skip timestamp
      cpu = Math.min(100, Math.round(vals.reduce((a, b) => a + Math.abs(b), 0) * 10) / 10)
    }

    // RAM: Linux has free/used/cached/buffers, macOS has active/wired/compressor/inactive/etc
    const ramRaw = ramData as { data?: number[][], labels?: string[] }
    let ramUsed = 0, ramTotal = 0
    if (ramRaw?.data?.[0] && ramRaw?.labels) {
      const vals = ramRaw.data[0].slice(1)
      const dims = ramRaw.labels.slice(1)
      const get = (name: string) => { const i = dims.indexOf(name); return i >= 0 ? Math.abs(vals[i]) : 0 }
      const isLinux = dims.includes('used') && dims.includes('free')
      if (isLinux) {
        const used = get('used'), free = get('free'), cached = get('cached'), buffers = get('buffers')
        ramTotal = Math.round((used + free + cached + buffers) / 1024 * 10) / 10
        ramUsed = Math.round(used / 1024 * 10) / 10
      } else {
        // macOS: used = active + wired + compressor (excluding inactive/free/purgeable)
        const active = get('active'), wired = get('wired'), compressor = get('compressor')
        const inactive = get('inactive'), free = get('free'), purgeable = get('purgeable')
        const speculative = get('speculative')
        ramTotal = Math.round((active + wired + compressor + inactive + free + purgeable + speculative) / 1024 * 10) / 10
        ramUsed = Math.round((active + wired + compressor) / 1024 * 10) / 10
      }
    }
    const ramPercent = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 1000) / 10 : 0

    // Disk: labels are avail,used,reserved for root (in GiB)
    const diskRaw = diskData as { data?: number[][], labels?: string[] }
    let diskUsed = 0, diskTotal = 0
    if (diskRaw?.data?.[0] && diskRaw?.labels) {
      const vals = diskRaw.data[0].slice(1)
      const dims = diskRaw.labels.slice(1) // skip 'time'
      const get = (name: string) => {
        const i = dims.indexOf(name)
        return i >= 0 ? Math.abs(vals[i]) : 0
      }
      // Values are in GiB
      const used = get('used')
      const avail = get('avail')
      const reserved = get('reserved for root')
      diskTotal = Math.round((used + avail + reserved) * 10) / 10
      diskUsed = Math.round(used * 10) / 10
    }
    const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 1000) / 10 : 0

    const uptimeRaw = uptimeData as { data?: number[][] }
    const uptime = formatUptime(uptimeRaw?.data?.[0]?.[1] ?? 0)

    return {
      name: host.name,
      online: true,
      cpu,
      ram: { used: ramUsed, total: ramTotal, percent: ramPercent },
      disk: { used: diskUsed, total: diskTotal, percent: diskPercent },
      uptime,
    }
  } catch {
    return {
      name: host.name,
      online: false,
      cpu: 0,
      ram: { used: 0, total: 0, percent: 0 },
      disk: { used: 0, total: 0, percent: 0 },
      uptime: 'N/A',
    }
  }
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hosts = await Promise.all(HOSTS.map(fetchHostMetrics))
  return NextResponse.json({ hosts })
}
