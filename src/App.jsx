import { useEffect, useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [tokens, setTokens] = useState(() => {
    try {
      const raw = localStorage.getItem('tokens')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (tokens) localStorage.setItem('tokens', JSON.stringify(tokens))
    else localStorage.removeItem('tokens')
  }, [tokens])

  return tokens ? (
    <Dashboard tokens={tokens} setTokens={setTokens} baseUrl={baseUrl} />
  ) : (
    <Login onSuccess={setTokens} baseUrl={baseUrl} />
  )
}

export default App
