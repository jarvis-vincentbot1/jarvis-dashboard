import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const ZABBIX_URL = 'http://212.192.243.78:8090/api_jsonrpc.php'
const ZABBIX_USER = 'Admin'
const ZABBIX_PASS = 'GameCreators@2026!'

const VPS_HOSTID = '10681' // VPS (gamecreators.io)

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

function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 ** 2)) * 10) / 10
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  return `${d}d ${h}h`
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const auth = await getAuth()

    // Fetch all system metrics
    const items = await zabbixRequest(
      'item.get',
      {
        hostids: [VPS_HOSTID],
        output: ['itemid', 'key_', 'lastvalue', 'lastclock', 'units'],
        filter: {
          key_: [
            // System info
            'system.uname',
            'kernel.release',
            'system.uptime',
            'system.hostname',
            // CPU
            'system.cpu.util',
            'system.cpu.num',
            // Memory
            'vm.memory.size[available]',
            'vm.memory.size[total]',
            // Disk
            'vfs.fs.size[/,used]',
            'vfs.fs.size[/,total]',
            'vfs.fs.size[/,pfree]',
          ],
        },
      },
      auth
    ) as Array<{ key_: string; lastvalue: string; lastclock: string }>

    // Build lookup
    const kv: Record<string, string | number> = {}
    for (const item of items) {
      const val = item.lastvalue
      // Try to parse as number, keep as string if not
      const numVal = parseFloat(val)
      kv[item.key_] = !isNaN(numVal) ? numVal : val
    }

    // System Info
    const osInfo = String(kv['system.uname'] || 'Unknown OS')
    const kernelRelease = String(kv['kernel.release'] || 'Unknown')
    const hostname = String(kv['system.hostname'] || 'VPS')

    // CPU
    const cpuCount = Number(kv['system.cpu.num'] || 1)
    const cpuUsage = Number(kv['system.cpu.util'] || 0)

    // Memory
    const ramAvail = Number(kv['vm.memory.size[available]'] || 0)
    const ramTotal = Number(kv['vm.memory.size[total]'] || 0)
    const ramUsed = ramTotal - ramAvail
    const ramUsedGB = bytesToGB(ramUsed)
    const ramTotalGB = bytesToGB(ramTotal)
    const ramPercent = ramTotalGB > 0 ? Math.round((ramUsedGB / ramTotalGB) * 100) : 0

    // Disk
    const diskUsed = Number(kv['vfs.fs.size[/,used]'] || 0)
    const diskTotal = Number(kv['vfs.fs.size[/,total]'] || 0)
    const diskFree = diskTotal - diskUsed
    const diskUsedGB = bytesToGB(diskUsed)
    const diskTotalGB = bytesToGB(diskTotal)
    const diskPercent = diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 100) : 0

    // Uptime
    const uptime = formatUptime(Number(kv['system.uptime'] || 0))

    // Try to fetch Docker stats if available
    let dockerStats = {
      containers: 0,
      images: 0,
      diskUsage: '0 GB',
    }

    try {
      // Attempt to get Docker metrics from Zabbix
      const dockerItems = await zabbixRequest(
        'item.get',
        {
          hostids: [VPS_HOSTID],
          output: ['itemid', 'key_', 'lastvalue'],
          filter: {
            key_: [
              'docker.containers',
              'docker.images',
              'docker.disk_usage',
            ],
          },
        },
        auth
      ) as Array<{ key_: string; lastvalue: string }>

      for (const item of dockerItems) {
        const val = item.lastvalue
        if (item.key_ === 'docker.containers') {
          dockerStats.containers = parseInt(val, 10) || 0
        } else if (item.key_ === 'docker.images') {
          dockerStats.images = parseInt(val, 10) || 0
        } else if (item.key_ === 'docker.disk_usage') {
          dockerStats.diskUsage = `${bytesToGB(parseInt(val, 10) || 0)} GB`
        }
      }
    } catch {
      // Docker stats not available
    }

    // Try to fetch security metrics
    let securityStats = {
      sshStatus: 'Unknown',
      fail2banActive: false,
    }

    try {
      const secItems = await zabbixRequest(
        'item.get',
        {
          hostids: [VPS_HOSTID],
          output: ['itemid', 'key_', 'lastvalue'],
          filter: {
            key_: ['service.status[sshd]', 'service.status[fail2ban]'],
          },
        },
        auth
      ) as Array<{ key_: string; lastvalue: string }>

      for (const item of secItems) {
        if (item.key_ === 'service.status[sshd]') {
          securityStats.sshStatus = item.lastvalue === '1' ? 'Running' : 'Stopped'
        } else if (item.key_ === 'service.status[fail2ban]') {
          securityStats.fail2banActive = item.lastvalue === '1'
        }
      }
    } catch {
      // Security stats not available
    }

    return NextResponse.json({
      vpsIp: '212.192.243.78',
      hostname,
      status: 'online',
      system: {
        os: osInfo,
        kernel: kernelRelease,
        uptime,
        cpuCount,
        cpuUsage: Math.round(cpuUsage * 10) / 10,
      },
      memory: {
        used: ramUsedGB,
        total: ramTotalGB,
        percent: ramPercent,
        available: bytesToGB(ramAvail),
      },
      disk: {
        used: diskUsedGB,
        total: diskTotalGB,
        free: bytesToGB(diskFree),
        percent: diskPercent,
      },
      docker: dockerStats,
      security: securityStats,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('VPS details error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch VPS details' },
      { status: 503 }
    )
  }
}
