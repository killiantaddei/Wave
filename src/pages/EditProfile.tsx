import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function EditProfile() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(profile?.username || '')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session || !profile) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-ink text-mist">
        Devi accedere per modificare il profilo.
      </div>
    )
  }

  function handlePickAvatar(f: File | null) {
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setError('Seleziona un\'immagine valida.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('L\'immagine supera i 5MB.')
      return
    }
    setError(null)
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!session || !profile) return
    setError(null)

    const cleanUsername = username.trim().toLowerCase()
    if (!/^[a-z0-9_.]{3,20}$/.test(cleanUsername)) {
      setError('Il nome utente deve avere 3-20 caratteri: lettere minuscole, numeri, "_" o "."')
      return
    }

    setSaving(true)
    try {
      let avatarUrl = profile.avatar_url

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${session.user.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl.publicUrl
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: cleanUsername,
          display_name: displayName.trim() || cleanUsername,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq('id', session.user.id)

      if (updateError) {
        if (updateError.message.includes('duplicate') || updateError.code === '23505') {
          throw new Error('Questo nome utente è già in uso, scegline un altro.')
        }
        throw updateError
      }

      await refreshProfile()
      navigate('/profile')
    } catch (err: any) {
      setError(err.message || 'Errore durante il salvataggio.')
    } finally {
      setSaving(false)
    }
  }

  return (
    /* Modificato il padding top in linea per agganciarsi al limite assoluto superiore del telefono */
    <div 
      className="min-h-[100dvh] bg-ink px-5 pb-28"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/profile')} className="text-mist">
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-semibold text-white">Modifica profilo</h1>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <button
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 overflow-hidden rounded-full bg-surface2 ring-1 ring-line"
        >
          {avatarPreview ? (
            <img src={avatarPreview} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-mist">
              <Camera size={24} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-1">
            <Camera size={14} className="text-white" />
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePickAvatar(e.target.files?.[0] || null)}
        />
        <p className="mt-2 text-xs text-mist">Tocca per cambiare foto</p>
      </div>

      <div className="mx-auto mt-6 max-w-md space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-mist">Nome utente</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="marco_rossi"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-white outline-none focus:border-signal"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-mist">Nome visualizzato</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Marco Rossi"
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-white outline-none focus:border-signal"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-mist">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={150}
            placeholder="Racconta qualcosa di te…"
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-white outline-none focus:border-signal"
          />
          <p className="mt-1 text-right text-xs text-mist">{bio.length}/150</p>
        </div>

        {error && <p className="text-sm text-flare">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-signal py-3.5 font-semibold text-ink disabled:opacity-50"
        >
          {saving ? 'Salvataggio…' : 'Salva modifiche'}
        </button>
      </div>
    </div>
  )
}
