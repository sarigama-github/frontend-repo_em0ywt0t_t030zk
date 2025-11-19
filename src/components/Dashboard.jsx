import { useEffect, useMemo, useState, useRef } from 'react'
import Employees from './Employees'
import Attendance from './Attendance'
import Leave from './Leave'
import Payroll from './Payroll'

export default function Dashboard({ tokens, setTokens, baseUrl }) {
  const token = tokens?.access_token
  const refreshToken = tokens?.refresh_token

  const [profile, setProfile] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('employees')
  const [health, setHealth] = useState({ status: 'checking' })

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])

  // Helper: decode JWT to schedule proactive refresh
  const parseJwt = (t) => {
    try {
      const base64Url = t.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      }).join(''))
      return JSON.parse(jsonPayload)
    } catch {
      return null
    }
  }

  const refreshTimer = useRef(null)
  const scheduleRefresh = () => {
    if (!refreshToken || !token) return
    const payload = parseJwt(token)
    if (!payload?.exp) return
    const expMs = payload.exp * 1000
    const now = Date.now()
    const delay = Math.max(5_000, expMs - now - 60_000) // refresh 60s before expiry (min 5s)
    if (refreshTimer.current) clearTimeout(refreshTimer.current)
    refreshTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${baseUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken })
        })
        if (r.ok) {
          const newTokens = await r.json()
          setTokens(newTokens)
        } else {
          setTokens(null)
        }
      } catch {
        setTokens(null)
      }
    }, delay)
  }

  useEffect(() => {
    scheduleRefresh()
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshToken])

  // Silent refresh helper + global 401 handling
  const fetchWithAuth = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } })
    if (res.status === 401 && refreshToken) {
      const r = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      })
      if (r.ok) {
        const newTokens = await r.json()
        setTokens(newTokens)
        const retry = await fetch(url, { ...options, headers: { Authorization: `Bearer ${newTokens.access_token}`, ...(options.headers || {}) } })
        return retry
      } else {
        setTokens(null)
        return res
      }
    }
    return res
  }

  // Health banner
  useEffect(() => {
    let timer
    const loadHealth = async () => {
      try {
        const res = await fetch(`${baseUrl}/health`)
        const d = await res.json().catch(() => ({}))
        setHealth(d)
      } catch {
        setHealth({ status: 'degraded', db: 'unavailable' })
      }
      timer = setTimeout(loadHealth, 60000)
    }
    loadHealth()
    return () => clearTimeout(timer)
  }, [baseUrl])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchWithAuth(`${baseUrl}/api/profile`)
        if (!res.ok) throw new Error('Failed to load profile')
        const data = await res.json()
        setProfile(data)
        setLogoUrl(data.logo_url || '')
      } catch (e) {
        setMsg('Failed to load profile')
      }
    }
    if (token) load()
  }, [token, baseUrl])

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setMsg('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${baseUrl}/api/settings/logo`, {
        method: 'POST',
        body: form,
        headers
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setLogoUrl(data.logo_url)
      setMsg('Logo updated')
    } catch (e) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter state for lists
  const [filters, setFilters] = useState({ q: '', status: '', df: '', dt: '' })

  const statusOptions = {
    attendance: [
      { value: '', label: 'All' },
      { value: 'present', label: 'Present' },
      { value: 'absent', label: 'Absent' },
      { value: 'leave', label: 'On Leave' },
      { value: 'clock_in', label: 'Clock In' },
      { value: 'clock_out', label: 'Clock Out' },
    ],
    leave: [
      { value: '', label: 'All' },
      { value: 'pending', label: 'Pending' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ]
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-4 p-4">
          <div className="w-10 h-10 rounded bg-slate-200 overflow-hidden flex items-center justify-center">
            {logoUrl ? (
              <img src={`${baseUrl}${logoUrl}`} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-slate-500">No Logo</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="font-semibold">MBF HR</h1>
            <p className="text-xs text-slate-500">Currency: {profile?.currency || 'TOP'} • Role: {profile?.role || 'user'}</p>
          </div>
          <label className="text-sm bg-blue-600 text-white px-3 py-1 rounded cursor-pointer">
            {loading ? 'Uploading...' : 'Upload Logo'}
            <input type="file" className="hidden" onChange={uploadLogo} accept="image/*" />
          </label>
          <button className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded" onClick={()=>setTokens(null)}>Logout</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {msg && <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{msg}</div>}
        {health?.status !== 'ok' && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
            Limited functionality: database connection is {health?.db || 'unavailable'}. Some actions may return 503.
          </div>
        )}

        <nav className="bg-white border rounded-xl p-2 flex flex-wrap gap-2 items-center">
          {[
            { id: 'employees', label: 'Employees' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'leave', label: 'Leave' },
            { id: 'payroll', label: 'Payroll' }
          ].map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2 rounded-lg ${tab===t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2 items-center">
            {tab === 'employees' && (
              <input className="input" placeholder="Search employees" value={filters.q} onChange={e=>setFilters(f=>({...f, q:e.target.value}))} />
            )}
            {(tab === 'attendance' || tab === 'leave' || tab === 'payroll') && (
              <>
                <input className="input" placeholder="From (YYYY-MM-DD)" value={filters.df} onChange={e=>setFilters(f=>({...f, df:e.target.value}))} />
                <input className="input" placeholder="To (YYYY-MM-DD)" value={filters.dt} onChange={e=>setFilters(f=>({...f, dt:e.target.value}))} />
              </>
            )}
            {(tab === 'attendance' || tab === 'leave') && (
              <select className="input" value={filters.status} onChange={e=>setFilters(f=>({...f, status:e.target.value}))}>
                {(statusOptions[tab] || []).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}
          </div>
        </nav>

        {tab === 'employees' && <Employees baseUrl={baseUrl} token={token} currency={profile?.currency || 'TOP'} role={profile?.role || 'user'} q={filters.q} />}
        {tab === 'attendance' && <Attendance baseUrl={baseUrl} token={token} filters={filters} role={profile?.role || 'user'} />}
        {tab === 'leave' && <Leave baseUrl={baseUrl} token={token} filters={filters} role={profile?.role || 'user'} />}
        {tab === 'payroll' && <Payroll baseUrl={baseUrl} token={token} currency={profile?.currency || 'TOP'} filters={filters} role={profile?.role || 'user'} />}
      </main>
    </div>
  )
}
