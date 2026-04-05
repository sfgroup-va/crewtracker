import https from 'https'
import http from 'http'

// Lightweight Supabase REST API client — uses native https, NO global fetch
// This avoids crashes with Next.js 14 on Node.js 24+
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ussppownncyiniojqlgb.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc3Bwb3dubmN5aW5pb2pxbGdiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTA0NTUxOSwiZXhwIjoyMDkwNjIxNTE5fQ.bYOIaYUGmaUBQKpERJCIjI5nyzg1JZHw09MRdg7UM9A'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzc3Bwb3dubmN5aW5pb2pxbGdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDU1MTksImV4cCI6MjA5MDYyMTUxOX0.9sduDRIfEZjzFdl9cOTS7GWxcM6I_iXDf2UumH-dVbg'

interface QueryOptions {
  table: string
  select?: string
  filter?: string
  filterParams?: Record<string, string>
  limit?: number
  order?: string
  body?: any
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
}

function nativeFetch(urlStr: string, options: {
  method: string
  headers: Record<string, string>
  body?: string
}): Promise<{ status: number; ok: boolean; data: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http
    const reqBody = options.body || undefined

    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: options.headers,
    }

    const req = lib.request(reqOptions, (res) => {
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          ok: (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 300,
          data,
        })
      })
    })

    req.on('error', (err: Error) => reject(err))
    req.setTimeout(30000, () => { req.destroy(new Error('Request timeout')) })

    if (reqBody) req.write(reqBody)
    req.end()
  })
}

export async function supaQuery<T = any>(opts: QueryOptions): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  const { table, select = '*', filter, filterParams = {}, limit, order, body, method = 'GET', headers = {} } = opts

  let url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`

  for (const [key, value] of Object.entries(filterParams)) {
    url += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }

  if (filter) url += `&${encodeURIComponent(filter)}`
  if (limit) url += `&limit=${limit}`
  if (order) url += `&order=${encodeURIComponent(order)}`

  try {
    const res = await nativeFetch(url, {
      method,
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'count=exact',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      let errBody: any
      try { errBody = JSON.parse(res.data) } catch { errBody = { message: res.data || 'Unknown error' } }
      return {
        data: null,
        error: {
          message: errBody.message || errBody.msg || `HTTP ${res.status}`,
          code: String(res.status),
        },
      }
    }

    if (method === 'DELETE' || method === 'PATCH') {
      const data = res.data ? JSON.parse(res.data) : null
      return { data, error: null }
    }

    const data = JSON.parse(res.data)
    return { data, error: null }
  } catch (err) {
    return {
      data: null,
      error: {
        message: err instanceof Error ? err.message : String(err),
      },
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === hash
}

export function generateId(): string {
  return crypto.randomUUID()
}

export { ANON_KEY }
