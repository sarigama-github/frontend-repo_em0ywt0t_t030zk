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

  const currentPayrollEstimate = (function(){
    const total = employees.reduce((sum, e) => sum + (e.salary || 0), 0)
    return currencyFmt(total)
  })()

  const canCreate = role === 'manager' || role === 'admin'

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold mb-3">Create Payroll Run</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2" role="alert">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Period Start (YYYY-MM-DD)" value={form.period_start} onChange={e=>setForm(f=>({...f, period_start:e.target.value}))} />
          <input className="input" placeholder="Period End (YYYY-MM-DD)" value={form.period_end} onChange={e=>setForm(f=>({...f, period_end:e.target.value}))} />
          <button className="btn-primary" disabled={loading || !canCreate} aria-disabled={!canCreate}>Create</button>
        </form>
        {!canCreate && <p className="text-xs text-slate-500 mt-2">Only managers/admins can create payroll runs</p>}
        <p className="text-sm text-slate-500 mt-2">Current estimated total across employees: <span className="font-medium text-slate-800">{currentPayrollEstimate}</span></p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h2 className="font-semibold">Payroll Runs</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <a className="btn-secondary" href={`${buildUrl().toString().replace('/payroll/runs', '/payroll/runs/export')}`} target="_blank" rel="noreferrer">Export CSV</a>
            <button onClick={loadRuns} className="btn-secondary" disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr className="table-head">
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
