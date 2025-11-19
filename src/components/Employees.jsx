import { useEffect, useState, useMemo } from 'react'

export default function Employees({ baseUrl, token, currency = 'TOP', role = 'user', q: qProp = '' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', position: '', salary: '', hire_date: '' })
  const [editingId, setEditingId] = useState(null)
  const [q, setQ] = useState(qProp)

  useEffect(() => { setQ(qProp) }, [qProp])

  const headers = useMemo(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const url = new URL(`${baseUrl}/api/hr/employees`)
      if (q) url.searchParams.set('q', q)
      const res = await fetch(url, { headers })
      if (!res.ok) throw new Error('Failed to load employees')
      const data = await res.json()
      setItems(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [q])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.first_name || !form.last_name) { setError('First and last name are required'); return }
    if (form.salary && isNaN(parseFloat(form.salary))) { setError('Salary must be a number'); return }
    if (form.hire_date && !/^\d{4}-\d{2}-\d{2}$/.test(form.hire_date)) { setError('Hire date must be YYYY-MM-DD'); return }

    setLoading(true)
    setError('')
    const payload = { ...form, salary: form.salary ? parseFloat(form.salary) : null }
    try {
      const res = await fetch(`${baseUrl}/api/hr/employees${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have permission to perform this action')
        throw new Error('Save failed')
      }
      setForm({ first_name: '', last_name: '', email: '', phone: '', position: '', salary: '', hire_date: '' })
      setEditingId(null)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const edit = (emp) => {
    setEditingId(emp.id)
    setForm({ ...emp, salary: emp.salary ?? '', hire_date: emp.hire_date ?? '' })
  }

  const currencyFmt = (v) => (v == null ? '-' : new Intl.NumberFormat('en-TO', { style: 'currency', currency }).format(v))

  const canManage = role === 'manager' || role === 'admin'

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-semibold mb-3">{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input className="input" placeholder="First name" value={form.first_name} onChange={e=>setForm(f=>({...f, first_name:e.target.value}))} required />
          <input className="input" placeholder="Last name" value={form.last_name} onChange={e=>setForm(f=>({...f, last_name:e.target.value}))} required />
          <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm(f=>({...f, email:e.target.value}))} />
          <input className="input" placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({...f, phone:e.target.value}))} />
          <input className="input" placeholder="Position" value={form.position} onChange={e=>setForm(f=>({...f, position:e.target.value}))} />
          <input className="input" placeholder={`Salary (${currency})`} value={form.salary} onChange={e=>setForm(f=>({...f, salary:e.target.value}))} />
          <input className="input" placeholder="Hire Date (YYYY-MM-DD)" value={form.hire_date} onChange={e=>setForm(f=>({...f, hire_date:e.target.value}))} />
          <div className="md:col-span-3 flex gap-2">
            <button className="btn-primary" disabled={loading || !canManage}>{editingId ? 'Update' : 'Create'}</button>
            {editingId && <button type="button" className="btn-secondary" onClick={()=>{setEditingId(null);setForm({ first_name: '', last_name: '', email: '', phone: '', position: '', salary: '', hire_date: '' })}}>Cancel</button>}
            {!canManage && <span className="text-xs text-slate-500 self-center">Only managers/admins can create or edit employees</span>}
          </div>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Employees</h2>
          <div className="flex gap-2 items-center">
            <input className="input" placeholder="Search" value={q} onChange={e=>setQ(e.target.value)} />
            <a className="btn-secondary" href={`${baseUrl}/api/hr/employees/export${q ? `?q=${encodeURIComponent(q)}` : ''}`} target="_blank" rel="noreferrer">Export CSV</a>
            <button onClick={load} className="btn-secondary" disabled={loading}>Refresh</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Phone</th>
                <th className="py-2 pr-4">Position</th>
                <th className="py-2 pr-4">Salary</th>
                <th className="py-2 pr-4">Hire Date</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(emp => (
                <tr key={emp.id} className="border-t">
                  <td className="py-2 pr-4">{emp.first_name} {emp.last_name}</td>
                  <td className="py-2 pr-4">{emp.email || '-'}</td>
                  <td className="py-2 pr-4">{emp.phone || '-'}</td>
                  <td className="py-2 pr-4">{emp.position || '-'}</td>
                  <td className="py-2 pr-4">{currencyFmt(emp.salary)}</td>
                  <td className="py-2 pr-4">{emp.hire_date || '-'}</td>
                  <td className="py-2 pr-4">
                    <button className={`text-blue-600 hover:underline disabled:opacity-50`} onClick={()=>edit(emp)} disabled={!canManage}>Edit</button>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td className="py-3 text-slate-500" colSpan={7}>No employees yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
