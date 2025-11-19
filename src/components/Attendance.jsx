import { useEffect, useMemo, useState } from 'react'

export default function Attendance({ baseUrl, token, filters = {}, role = 'user' }) {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ employee_id: '', status: 'present', note: '' })

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
    const url = new URL(`${baseUrl}/api/hr/attendance`)
    if (filters.df) url.searchParams.set('date_from', filters.df)
    if (filters.dt) url.searchParams.set('date_to', filters.dt)
    if (filters.status) url.searchParams.set('status', filters.status)
    return url
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(buildUrl(), { headers })
      if (!res.ok) throw new Error('Failed to load attendance')
      const data = await res.json()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(); loadEmployees() }, [])
  useEffect(() => { load() }, [filters.df, filters.dt, filters.status])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.employee_id) { setError('Employee is required'); return }

    setLoading(true)
    setError('')
    try {
      const payload = { ...form, employee_id: parseInt(form.employee_id) }
      const res = await fetch(`${baseUrl}/api/hr/attendance`, { method: 'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have permission to record attendance')
        throw new Error('Save failed')
      }
      setForm({ employee_id: '', status: 'present', note: '' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canRecord = role === 'staff' || role === 'manager' || role === 'admin'

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-semibold mb-3">Record Attendance</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2" role="alert">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="input" value={form.employee_id} onChange={e=>setForm(f=>({...f, employee_id:e.target.value}))}>
            <option value="">Select employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </select>
          <select className="input" value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">On Leave</option>
            <option value="clock_in">Clock In</option>
            <option value="clock_out">Clock Out</option>
          </select>
          <input className="input" placeholder="Note" value={form.note} onChange={e=>setForm(f=>({...f, note:e.target.value}))} />
          <div className="md:col-span-1">
            <button className="btn-primary" disabled={loading || !canRecord} aria-disabled={!canRecord}>Save</button>
          </div>
        </form>
        {!canRecord && <p className="text-xs text-slate-500 mt-2">Only staff/managers/admins can record attendance</p>}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
          <h2 className="font-semibold">Attendance</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <a className="btn-secondary" href={`${buildUrl().toString().replace('/attendance', '/attendance/export')}`} target="_blank" rel="noreferrer">Export CSV</a>
            <button onClick={load} className="btn-secondary" disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr className="table-head">
                <th className="py-2 pr-4">Timestamp</th>
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Note</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => {
                const emp = employees.find(e => e.id === row.employee_id)
                return (
                  <tr key={row.id} className="border-t">
                    <td className="py-2 pr-4">{row.ts || '-'}</td>
                    <td className="py-2 pr-4">{emp ? `${emp.first_name} ${emp.last_name}` : row.employee_id}</td>
                    <td className="py-2 pr-4 capitalize">
                      <span className={`chip ${row.status==='approved' || row.status==='present' ? 'border-green-300 text-green-700 bg-green-50' : row.status==='rejected' || row.status==='absent' ? 'border-red-300 text-red-700 bg-red-50' : 'border-slate-300 text-slate-700 bg-slate-50'}`}>{row.status || '-'}</span>
                    </td>
                    <td className="py-2 pr-4">{row.note || '-'}</td>
                  </tr>
                )
              })}
              {!items.length && (
                <tr><td className="py-3 text-slate-500" colSpan={4}>No attendance records yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
