import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, display_name: username } },
      })
      if (error) setError(tradErrore(error.message))
      else navigate('/')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(tradErrore(error.message))
      else navigate('/')
    }
    setLoading(false)
  }

  function tradErrore(msg: string) {
    if (msg.includes('Invalid login credentials')) return 'Email o password non corretti.'
    if (msg.includes('already registered')) return 'Email già registrata. Prova ad accedere.'
    return msg
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-semibold text-white">
          {mode === 'login' ? 'Bentornato' : 'Crea il tuo account'}
        </h1>
        <p className="mt-2 text-sm text-mist">
          {mode === 'login' ? 'Accedi per continuare a guardare Wave.' : 'Inizia a pubblicare i tuoi video.'}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-mist">Nome utente</label>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.trim())}
                placeholder="marco_rossi"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-white outline-none focus:border-signal"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-mist">Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@esempio.com"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-white outline-none focus:border-signal"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-mist">Password</label>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-white outline-none focus:border-signal"
            />
          </div>

          {error && <p className="text-sm text-flare">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-signal py-3.5 font-semibold text-ink disabled:opacity-60"
          >
            {loading ? 'Attendere…' : mode === 'login' ? 'Accedi' : 'Registrati'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-6 w-full text-center text-sm text-mist"
        >
          {mode === 'login' ? (
            <>
              Non hai un account? <span className="text-signal">Registrati</span>
            </>
          ) : (
            <>
              Hai già un account? <span className="text-signal">Accedi</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
