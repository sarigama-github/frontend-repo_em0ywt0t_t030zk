import { useEffect, useState } from 'react'
import Employees from './Employees'
import Attendance from './Attendance'
import Leave from './Leave'
import Payroll from './Payroll'

export default function Dashboard({ token, baseUrl }) {
  const [profile, setProfile] = useState(null)
  const [logoUrl, setLogoUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('employees')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        setProfile(data)
        setLogoUrl(data.logo_url || '')
      } catch (e) {
        setMsg('Failed to load profile')
      }
    }
    load()
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
        body: form
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
            <p className="text-xs text-slate-500">Currency: {profile?.currency || 'TOP'}</p>
          </div>
          <label className="text-sm bg-blue-600 text-white px-3 py-1 rounded cursor-pointer">
            {loading ? 'Uploading...' : 'Upload Logo'}
            <input type="file" className="hidden" onChange={uploadLogo} accept="image/*" />
          </label>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {msg && <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-2">{msg}</div>}

        <nav className="bg-white border rounded-xl p-2 flex gap-2">
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
        </nav>

        {tab === 'employees' && <Employees baseUrl={baseUrl} token={token} currency={profile?.currency || 'TOP'} />}
        {tab === 'attendance' && <Attendance baseUrl={baseUrl} token={token} />}
        {tab === 'leave' && <Leave baseUrl={baseUrl} token={token} />}
        {tab === 'payroll' && <Payroll baseUrl={baseUrl} token={token} currency={profile?.currency || 'TOP'} />}
      </main>
    </div>
  )
}
