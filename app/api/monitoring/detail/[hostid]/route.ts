import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const ZABBIX_URL = 'http://212.192.243.78:8090/api_jsonrpc.php'
const ZABBIX_USER = 'Admin'
const ZABBIX_PASS = 'GameCreators@2026!'

let authToken: string | null = null
let authExpiry = 0

async function zabbixRequest(method: string, params: unknown, auth?: string) {
  const body: Record<string, unknown> = { jsonrpc: '2.0', method, params, id: 1 }
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
  authToken = await zabbixRequest('user.login', { username: ZABBIX_USER, password: ZABBIX_PASS })
  authExpiry = Date.now() + 25 * 60 * 1000
  return authToken as string
}

function bytesToGB(b: number) { return Math.round(b / 1024 ** 3 * 10) / 10 }
function bytesToMB(b: number) { return Math.round(b / 1024 ** 2 * 10) / 10 }

export async function GET(_req: Request, { params }: { params: { hostid: string } }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { hostid } = params

  try {
    const auth = await getAuth()

    const items = await zabbixRequest('item.get', {
      hostids: [hostid],
      output: ['key_', 'lastvalue', 'units', 'lastclock'],
      sortfield: 'key_',
    }, auth) as Array<{ key_: string; lastvalue: string; units: string; lastclock: string }>

    // Build key→value map
    const kv: Record<string, number> = {}
    const kvStr: Record<string, string> = {}
    for (const item of items) {
      const val = parseFloat(item.lastvalue)
      if (!isNaN(val)) kv[item.key_] = val
      kvStr[item.key_] = item.lastvalue
    }

    const isMac = (kvStr['system.uname'] ?? '').startsWith('Darwin')

    // ── CPU breakdown ──────────────────────────────────────────────────────────
    const cpuModes: Record<string, number> = {}
    for (const mode of ['user', 'system', 'iowait', 'softirq', 'steal', 'nice', 'idle', 'interrupt']) {
      const v = kv[`system.cpu.util[,${mode}]`]
      if (v !== undefined) cpuModes[mode] = Math.round(v * 10) / 10
    }

    // ── Load average ───────────────────────────────────────────────────────────
    const loadAvg = isMac
      ? {
          avg1:  Math.round((kv['system.cpu.load[percpu,avg1]']  ?? 0) * 1000) / 1000,
          avg5:  Math.round((kv['system.cpu.load[percpu,avg5]']  ?? 0) * 1000) / 1000,
          avg15: Math.round((kv['system.cpu.load[percpu,avg15]'] ?? 0) * 1000) / 1000,
        }
      : {
          avg1:  Math.round((kv['system.cpu.load[all,avg1]']  ?? 0) * 1000) / 1000,
          avg5:  Math.round((kv['system.cpu.load[all,avg5]']  ?? 0) * 1000) / 1000,
          avg15: Math.round((kv['system.cpu.load[all,avg15]'] ?? 0) * 1000) / 1000,
        }

    // ── Processes ──────────────────────────────────────────────────────────────
    const processes = {
      total:   kv['proc.num']           ?? 0,
      running: kv['proc.num[,,run]']    ?? 0,
      cpuCount: kv['system.cpu.num']    ?? 0,
    }

    // ── Swap (Linux only) ──────────────────────────────────────────────────────
    const swapTotal = kv['system.swap.size[,total]'] ?? 0
    const swapFree  = kv['system.swap.size[,free]']  ?? 0
    const swap = swapTotal > 0
      ? { total: bytesToGB(swapTotal), free: bytesToGB(swapFree), used: bytesToGB(swapTotal - swapFree),
          percent: Math.round(((swapTotal - swapFree) / swapTotal) * 1000) / 10 }
      : null

    // ── Network ────────────────────────────────────────────────────────────────
    const netInterfaces: Array<{ name: string; rxMB: number; txMB: number }> = []
    const seenIfaces = new Set<string>()
    for (const item of items) {
      const m = item.key_.match(/^net\.if\.in\["?([^"]+)"?\]$/)
      if (m) {
        const iface = m[1]
        if (!seenIfaces.has(iface)) {
          seenIfaces.add(iface)
          const rx = kv[`net.if.in["${iface}"]`] ?? kv[`net.if.in[${iface}]`] ?? 0
          const tx = kv[`net.if.out["${iface}"]`] ?? kv[`net.if.out[${iface}]`] ?? 0
          // Filter out zero/loopback
          if (rx > 0 || tx > 0) {
            netInterfaces.push({ name: iface, rxMB: bytesToMB(rx), txMB: bytesToMB(tx) })
          }
        }
      }
    }

    // ── System info ────────────────────────────────────────────────────────────
    const sysInfo = {
      uname:    kvStr['system.uname']    ?? '',
      hostname: kvStr['agent.hostname']  ?? '',
      version:  kvStr['agent.version']   ?? '',
    }

    return NextResponse.json({
      hostid,
      isMac,
      sysInfo,
      cpuModes,
      loadAvg,
      processes,
      swap,
      netInterfaces,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 503 }
    )
  }
}
