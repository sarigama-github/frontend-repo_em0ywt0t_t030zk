import { useEffect, useMemo, useState } from 'react'

export default function Leave({ baseUrl, token, filters = {}, role = 'user' }) {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ employee_id: '', start_date: '', end_date: '', leave_type: 'annual', reason: '' })

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
    const url = new URL(`${baseUrl}/api/hr/leave`)
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
      if (!res.ok) throw new Error('Failed to load leave requests')
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
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(form.end_date)) { setError('Dates must be YYYY-MM-DD'); return }

    setLoading(true)
    setError('')
    try {
      const payload = { ...form, employee_id: parseInt(form.employee_id) }
      const res = await fetch(`${baseUrl}/api/hr/leave`, { method: 'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Save failed')
      setForm({ employee_id: '', start_date: '', end_date: '', leave_type: 'annual', reason: '' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id, status) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${baseUrl}/api/hr/leave/${id}`, { method: 'PUT', headers, body: JSON.stringify({ status }) })
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have permission to approve/reject')
        throw new Error('Update failed')
      }
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const canApprove = role === 'manager' || role === 'admin'

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Submit Leave Request</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" value={form.employee_id} onChange={e=>setForm(f=>({...f, employee_id:e.target.value}))}>
            <option value="">Select employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </select>
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="Start Date (YYYY-MM-DD)" value={form.start_date} onChange={e=>setForm(f=>({...f, start_date:e.target.value}))} />
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="End Date (YYYY-MM-DD)" value={form.end_date} onChange={e=>setForm(f=>({...f, end_date:e.target.value}))} />
          <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" value={form.leave_type} onChange={e=>setForm(f=>({...f, leave_type:e.target.value}))}>
            <option value="annual">Annual</option>
            <option value="sick">Sick</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="Reason" value={form.reason} onChange={e=>setForm(f=>({...f, reason:e.target.value}))} />
          <div className="md:col-span-5">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg disabled:opacity-60" disabled={loading}>Submit</button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Leave Requests</h2>
          <div className="flex gap-2">
            <a className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg" href={`${buildUrl().toString().replace('/leave', '/leave/export')}`} target="_blank" rel="noreferrer">Export CSV</a>
            <button onClick={load} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg disabled:opacity-60" disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">From</th>
                <th className="py-2 pr-4">To</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => {
                const emp = employees.find(e => e.id === row.employee_id)
                return (
                  <tr key={row.id} className="border-t">
                    <td className="py-2 pr-4">{emp ? `${emp.first_name} ${emp.last_name}` : row.employee_id}</td>
                    <td className="py-2 pr-4">{row.start_date}</td>
                    <td className="py-2 pr-4">{row.end_date}</td>
                    <td className="py-2 pr-4 capitalize">{row.leave_type}</td>
                    <td className="py-2 pr-4 capitalize">{row.status}</td>
                    <td className="py-2 pr-4 space-x-2">
                      {row.status === 'pending' && (
                        <>
                          <button className={`text-green-600 hover:underline ${!canApprove ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={()=>canApprove && updateStatus(row.id, 'approved')} disabled={!canApprove}>Approve</button>
                          <button className={`text-red-600 hover:underline ${!canApprove ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={()=>canApprove && updateStatus(row.id, 'rejected')} disabled={!canApprove}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
              {!items.length && (
                <tr><td className="py-3 text-slate-500" colSpan={6}>No leave requests yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
