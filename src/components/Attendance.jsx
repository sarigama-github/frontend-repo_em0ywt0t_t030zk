import { useEffect, useState } from 'react'

export default function Attendance({ baseUrl, token }) {
  const [items, setItems] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ employee_id: '', date: '', status: 'present', notes: '' })

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

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

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${baseUrl}/api/hr/attendance`, { headers })
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

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form, employee_id: form.employee_id ? parseInt(form.employee_id) : null }
      const res = await fetch(`${baseUrl}/api/hr/attendance`, { method: 'POST', headers, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Save failed')
      setForm({ employee_id: '', date: '', status: 'present', notes: '' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">Record Attendance</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" value={form.employee_id} onChange={e=>setForm(f=>({...f, employee_id:e.target.value}))}>
            <option value="">Select employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</option>
            ))}
          </select>
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="Date (YYYY-MM-DD)" value={form.date} onChange={e=>setForm(f=>({...f, date:e.target.value}))} />
          <select className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="leave">On Leave</option>
          </select>
          <input className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2" placeholder="Notes" value={form.notes} onChange={e=>setForm(f=>({...f, notes:e.target.value}))} />
          <div className="md:col-span-4">
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg disabled:opacity-60" disabled={loading}>Save</button>
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Attendance</h2>
          <button onClick={load} className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-2 rounded-lg disabled:opacity-60" disabled={loading}>Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Employee</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => {
                const emp = employees.find(e => e.id === row.employee_id)
                return (
                  <tr key={row.id || `${row.employee_id}-${row.date}`} className="border-t">
                    <td className="py-2 pr-4">{row.date || '-'}</td>
                    <td className="py-2 pr-4">{emp ? `${emp.first_name} ${emp.last_name}` : row.employee_id}</td>
                    <td className="py-2 pr-4 capitalize">{row.status || '-'}</td>
                    <td className="py-2 pr-4">{row.notes || '-'}</td>
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
