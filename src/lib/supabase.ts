// Lightweight Supabase REST API client — no SDK dependency
// Hardcoded fallback so it works even if .env.local is missing
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
    const res = await fetch(url, {
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
      const errBody = await res.json().catch(() => ({ message: res.statusText }))
      return { data: null, error: { message: errBody.message || errBody.msg || res.statusText, code: String(res.status) } }
    }

    if (method === 'DELETE' || method === 'PATCH') {
      const text = await res.text()
      return { data: text ? JSON.parse(text) : null, error: null }
    }

    const data = await res.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : String(err) } }
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

// Node 24 compatible query using https.request (fetch() crashes Next.js 14 on Node 24)
export async function supaQueryHttps<T = any>(opts: QueryOptions): Promise<{ data: T | null; error: { message: string; code?: string } | null }> {
  const https = await import('https')
  const { table, select = '*', filter, filterParams = {}, limit, order, body, method = 'GET', headers = {} } = opts

  let urlStr = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`
  for (const [key, value] of Object.entries(filterParams)) {
    urlStr += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`
  }
  if (filter) urlStr += `&${encodeURIComponent(filter)}`
  if (limit) urlStr += `&limit=${limit}`
  if (order) urlStr += `&order=${encodeURIComponent(order)}`

  const parsedUrl = new URL(urlStr)

  const defaultHeaders: Record<string, string> = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : 'count=exact',
    ...headers,
  }

  return new Promise((resolve) => {
    const reqOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: defaultHeaders,
    }

    const req = https.request(reqOptions, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => {
        const bodyStr = Buffer.concat(chunks).toString()
        if (res.statusCode && res.statusCode >= 400) {
          try {
            const errBody = JSON.parse(bodyStr)
            resolve({ data: null, error: { message: errBody.message || errBody.msg || `HTTP ${res.statusCode}`, code: String(res.statusCode) } })
          } catch {
            resolve({ data: null, error: { message: `HTTP ${res.statusCode}`, code: String(res.statusCode) } })
          }
          return
        }
        try {
          const data = bodyStr ? JSON.parse(bodyStr) : null
          resolve({ data, error: null })
        } catch {
          resolve({ data: null, error: { message: 'Invalid JSON response' } })
        }
      })
    })

    req.on('error', (err) => {
      resolve({ data: null, error: { message: err.message } })
    })

    if (body && (method === 'POST' || method === 'PATCH')) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

export { ANON_KEY }
