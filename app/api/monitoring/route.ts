import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const ZABBIX_URL = 'http://212.192.243.78:8090/api_jsonrpc.php'
const ZABBIX_USER = 'Admin'
const ZABBIX_PASS = 'GameCreators@2026!'

// Zabbix host IDs
const HOSTS = [
  { hostid: '10681', name: 'VPS (gamecreators.io)', icon: '🖥' },
  { hostid: '10680', name: 'Mac mini', icon: '💻' },
]

let authToken: string | null = null
let authExpiry = 0

async function zabbixRequest(method: string, params: unknown, auth?: string) {
  const body: Record<string, unknown> = {
    jsonrpc: '2.0',
    method,
    params,
    id: 1,
  }
  if (auth) body.auth = auth

  const res = await fetch(ZABBIX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.data || data.error.message)
  return data.result
}

async function getAuth(): Promise<string> {
  if (authToken && Date.now() < authExpiry) return authToken
  authToken = await zabbixRequest('user.login', {
    username: ZABBIX_USER,
    password: ZABBIX_PASS,
  })
  authExpiry = Date.now() + 25 * 60 * 1000 // 25 min
  return authToken as string
}

function bytesToGB(bytes: number): number {
  return Math.round((bytes / (1024 ** 3)) * 10) / 10
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return `${d}d ${h}h`
}

async function fetchHostMetrics(host: { hostid: string; name: string; icon: string }, auth: string) {
  try {
    // Fetch all relevant items for this host in one call
    const items = await zabbixRequest('item.get', {
      hostids: [host.hostid],
      output: ['itemid', 'key_', 'lastvalue', 'lastclock', 'units'],
      filter: {
        key_: [
          // Linux CPU
          'system.cpu.util',
          'system.cpu.util[,user]',
          'system.cpu.util[,system]',
          'system.cpu.util[,nice]',
          'system.cpu.util[,iowait]',
          'system.cpu.util[,interrupt]',
          'system.cpu.util[,softirq]',
          'system.cpu.util[,steal]',
          // macOS CPU (load average per CPU — multiply × 100 for rough %)
          'system.cpu.load[percpu,avg1]',
          // RAM (same keys for both)
          'vm.memory.size[available]',
          'vm.memory.size[total]',
          // Linux disk
          'vfs.fs.size[/,used]',
          'vfs.fs.size[/,total]',
          // macOS disk (dependent items)
          'vfs.fs.dependent.size[/,used]',
          'vfs.fs.dependent.size[/,total]',
          // Uptime
          'system.uptime',
        ],
      },
    }, auth) as Array<{ key_: string; lastvalue: string; lastclock: string }>

    // Build a key→value lookup
    const kv: Record<string, number> = {}
    for (const item of items) {
      const val = parseFloat(item.lastvalue)
      if (!isNaN(val)) kv[item.key_] = val
    }

    // Determine if we got any data at all
    const hasData = Object.keys(kv).length > 0

    // CPU: Linux uses system.cpu.util (%), macOS uses system.cpu.load[percpu,avg1] (load avg)
    let cpu = 0
    if (kv['system.cpu.util'] !== undefined) {
      cpu = Math.round(kv['system.cpu.util'] * 10) / 10
    } else if (kv['system.cpu.load[percpu,avg1]'] !== undefined) {
      // Load avg per CPU: 1.0 = 100% for one core; clamp to 100
      cpu = Math.min(100, Math.round(kv['system.cpu.load[percpu,avg1]'] * 100 * 10) / 10)
    } else {
      const modes = ['user', 'system', 'nice', 'iowait', 'interrupt', 'softirq', 'steal']
      for (const m of modes) {
        const v = kv[`system.cpu.util[,${m}]`]
        if (v !== undefined) cpu += v
      }
      cpu = Math.round(cpu * 10) / 10
    }

    // RAM (same keys on both Linux and macOS)
    const ramAvail = kv['vm.memory.size[available]'] ?? 0
    const ramTotal = kv['vm.memory.size[total]'] ?? 0
    const ramUsed = ramTotal - ramAvail
    const ramUsedGB = bytesToGB(ramUsed)
    const ramTotalGB = bytesToGB(ramTotal)
    const ramPercent = ramTotalGB > 0 ? Math.round((ramUsedGB / ramTotalGB) * 1000) / 10 : 0

    // Disk: try Linux keys first, fall back to macOS dependent keys
    const diskUsedBytes = kv['vfs.fs.size[/,used]'] ?? kv['vfs.fs.dependent.size[/,used]'] ?? 0
    const diskTotalBytes = kv['vfs.fs.size[/,total]'] ?? kv['vfs.fs.dependent.size[/,total]'] ?? 0
    const diskUsedGB = bytesToGB(diskUsedBytes)
    const diskTotalGB = bytesToGB(diskTotalBytes)
    const diskPercent = diskTotalGB > 0 ? Math.round((diskUsedGB / diskTotalGB) * 1000) / 10 : 0

    // Uptime
    const uptime = formatUptime(kv['system.uptime'] ?? 0)

    return {
      hostid: host.hostid,
      name: host.name,
      icon: host.icon,
      online: hasData,
      cpu,
      ram: { used: ramUsedGB, total: ramTotalGB, percent: ramPercent },
      disk: { used: diskUsedGB, total: diskTotalGB, percent: diskPercent },
      uptime,
    }
  } catch {
    return {
      hostid: host.hostid,
      name: host.name,
      icon: host.icon,
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

  try {
    const auth = await getAuth()
    const hosts = await Promise.all(HOSTS.map((h) => fetchHostMetrics(h, auth)))
    return NextResponse.json({ hosts, source: 'zabbix' })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Zabbix unreachable' },
      { status: 503 }
    )
  }
}
