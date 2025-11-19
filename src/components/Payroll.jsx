import { useEffect, useMemo, useState } from 'react'

export default function Payroll({ baseUrl, token, currency = 'TOP', filters = {}, role = 'user' }) {
  const [runs, setRuns] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ period_start: '', period_end: '' })

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token])

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/hr/employees`, { headers })
      if (!res.ok) throw new Error('Failed to load employees')
      const data = await res.json()
      setEmployees(data)
    } catch (e) {
      setError(e.message)
    }
  }

  const buildUrl = () => {
    const url = new URL(`${baseUrl}/api/hr/payroll/runs`)
    if (filters.df) url.searchParams.set('date_from', filters.df)
    if (filters.dt) url.searchParams.set('date_to', filters.dt)
    return url
  }

  const loadRuns = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(buildUrl(), { headers })
      if (!res.ok) throw new Error('Failed to load payroll runs')
      const data = await res.json()
      setRuns(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRuns(); loadEmployees() }, [])
  useEffect(() => { loadRuns() }, [filters.df, filters.dt])

  const submit = async (e) => {
    e.preventDefault()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.period_start) || !/^\d{4}-\d{2}-\d{2}$/.test(form.period_end)) { setError('Dates must be YYYY-MM-DD'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${baseUrl}/api/hr/payroll/runs`, { method: 'POST', headers, body: JSON.stringify(form) })
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have permission to create payroll runs')
        throw new Error('Save failed')
      }
      setForm({ period_start: '', period_end: '' })
      await loadRuns()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const currencyFmt = (v) => (v == null ? '-' : new Intl.NumberFormat('en-TO', { style: 'currency', currency }).format(v))

  const currentPayrollEstimate = useMemo(() => {
    const total = employees.reduce((sum, e) => sum + (e.salary || 0), 0)
    return currencyFmt(total)
  }, [employees])

  const canCreate = role === 'manager' || role === 'admin'

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Create Payroll Run</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="Period Start (YYYY-MM-DD)" value={form.period_start} onChange={e=>setForm(f=>({...f, period_start:e.target.value}))} />
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="Period End (YYYY-MM-DD)" value={form.period_end} onChange={e=>setForm(f=>({...f, period_end:e.target.value}))} />
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg disabled:opacity-60" disabled={loading || !canCreate}>Create</button>
        </form>
        {!canCreate && <p className="text-xs text-slate-500 mt-2">Only managers/admins can create payroll runs</p>}
        <p className="text-sm text-slate-500 mt-2">Current estimated total across employees: <span className="font-medium text-slate-800">{currentPayrollEstimate}</span></p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Payroll Runs</h2>
          <div className="flex gap-2">
            <a className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg" href={`${buildUrl().toString().replace('/payroll/runs', '/payroll/runs/export')}`} target="_blank" rel="noreferrer">Export CSV</a>
            <button onClick={loadRuns} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg disabled:opacity-60" disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Period</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(row => (
                <tr key={row.id} className="border-t">
                  <td className="py-2 pr-4">{row.period_start} — {row.period_end}</td>
                  <td className="py-2 pr-4">{currencyFmt(row.total_amount)}</td>
                  <td className="py-2 pr-4">{row.created_at || '-'}</td>
                </tr>
              ))}
              {!runs.length && (
                <tr><td className="py-3 text-slate-500" colSpan={3}>No payroll runs yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
