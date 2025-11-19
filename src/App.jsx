import { useState } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'

function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [tokens, setTokens] = useState(null)

  return tokens ? (
    <Dashboard token={tokens.access_token} baseUrl={baseUrl} />
  ) : (
    <Login onSuccess={setTokens} baseUrl={baseUrl} />
  )
}

export default App
