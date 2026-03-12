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
    const [cpuData, ramData, diskData, info] = await Promise.all([
      fetchNetdata(host.base, '/data?chart=system.cpu&points=1&after=-1'),
      fetchNetdata(host.base, '/data?chart=system.ram&points=1&after=-1'),
      fetchNetdata(host.base, '/data?chart=disk_space._&points=1&after=-1'),
      fetchNetdata(host.base, '/info'),
    ])

    // CPU: system.cpu dimensions are user,system,... summing all non-idle
    const cpuRaw = cpuData as { data?: number[][]; dimension_names?: string[] }
    let cpu = 0
    if (cpuRaw?.data?.[0] && cpuRaw?.dimension_names) {
      const idleIdx = cpuRaw.dimension_names.indexOf('idle')
      const vals = cpuRaw.data[0].slice(1) // skip timestamp
      const total = vals.reduce((a, b) => a + Math.abs(b), 0)
      const idle = idleIdx >= 0 ? Math.abs(vals[idleIdx]) : 0
      cpu = total > 0 ? Math.round(((total - idle) / total) * 1000) / 10 : 0
    }

    // RAM: dimensions are free,used,cached,buffers
    const ramRaw = ramData as { data?: number[][]; dimension_names?: string[] }
    let ramUsed = 0, ramTotal = 0
    if (ramRaw?.data?.[0] && ramRaw?.dimension_names) {
      const vals = ramRaw.data[0].slice(1)
      const dims = ramRaw.dimension_names
      const get = (name: string) => {
        const i = dims.indexOf(name)
        return i >= 0 ? Math.abs(vals[i]) : 0
      }
      // Values are in MiB
      const used = get('used')
      const free = get('free')
      const cached = get('cached')
      const buffers = get('buffers')
      ramTotal = Math.round((used + free + cached + buffers) / 1024 * 10) / 10
      ramUsed = Math.round(used / 1024 * 10) / 10
    }
    const ramPercent = ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 1000) / 10 : 0

    // Disk: dimensions are avail,used,reserved
    const diskRaw = diskData as { data?: number[][]; dimension_names?: string[] }
    let diskUsed = 0, diskTotal = 0
    if (diskRaw?.data?.[0] && diskRaw?.dimension_names) {
      const vals = diskRaw.data[0].slice(1)
      const dims = diskRaw.dimension_names
      const get = (name: string) => {
        const i = dims.indexOf(name)
        return i >= 0 ? Math.abs(vals[i]) : 0
      }
      // Values are in GiB
      const used = get('used')
      const avail = get('avail')
      const reserved = get('reserved_for_root')
      diskTotal = Math.round((used + avail + reserved) * 10) / 10
      diskUsed = Math.round(used * 10) / 10
    }
    const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 1000) / 10 : 0

    const infoRaw = info as { uptime?: number }
    const uptime = formatUptime(infoRaw?.uptime ?? 0)

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
