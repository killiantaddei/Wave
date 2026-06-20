import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UploadCloud, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Upload() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-ink px-6 text-center">
        <p className="font-display text-xl font-semibold text-white">Accedi per pubblicare</p>
        <p className="mt-2 text-sm text-mist">Devi avere un account per caricare video su Wave.</p>
        <button
          onClick={() => navigate('/auth')}
          className="mt-6 rounded-full bg-signal px-6 py-3 font-semibold text-ink"
        >
          Vai al login
        </button>
      </div>
    )
  }

  function handlePick(f: File | null) {
    if (!f) return
    if (!f.type.startsWith('video/')) {
      setError('Seleziona un file video valido.')
      return
    }
    if (f.size > 100 * 1024 * 1024) {
      setError('Il video supera i 100MB.')
      return
    }
    if (f.type === 'video/quicktime' || f.name.toLowerCase().endsWith('.mov')) {
      setError(
        'Attenzione: i file .mov registrati su iPhone a volte non si riproducono su altri browser. Se possibile usa un .mp4 (su iPhone: Impostazioni → Fotocamera → Formato → "Più compatibile").'
      )
    } else {
      setError(null)
    }
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
  }

  async function handleUpload() {
    if (!file || !session) return
    setUploading(true)
    setError(null)

    try {
      const ext = file.name.split('.').pop()
      const path = `${session.user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage.from('videos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError

      const { data: publicUrl } = supabase.storage.from('videos').getPublicUrl(path)

      const { error: insertError } = await supabase.from('videos').insert({
        user_id: session.user.id,
        video_url: publicUrl.publicUrl,
        caption: caption.trim() || null,
      })
      if (insertError) throw insertError

      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Errore durante il caricamento.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-ink px-5 pb-28 pt-8">
      <h1 className="font-display text-2xl font-semibold text-white">Carica un video</h1>
      <p className="mt-1 text-sm text-mist">MP4 o MOV, fino a 100MB.</p>

      {!previewUrl && (
        <button
          onClick={() => inputRef.current?.click()}
          className="mt-8 flex aspect-[9/14] w-full max-w-[260px] flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line bg-surface text-mist"
        >
          <UploadCloud size={32} />
          <span className="text-sm font-medium">Tocca per scegliere un video</span>
        </button>
      )}

      {previewUrl && (
        <div className="relative mt-8 aspect-[9/14] w-full max-w-[260px] overflow-hidden rounded-3xl bg-black">
          <video src={previewUrl} controls className="h-full w-full object-cover" />
          <button
            onClick={() => {
              setFile(null)
              setPreviewUrl(null)
            }}
            className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handlePick(e.target.files?.[0] || null)}
      />

      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Scrivi una didascalia…"
        rows={3}
        className="mt-6 w-full max-w-md resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-white outline-none focus:border-signal"
      />

      {error && <p className="mt-3 text-sm text-flare">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="mt-6 w-full max-w-md rounded-full bg-signal py-3.5 font-semibold text-ink disabled:opacity-50"
      >
        {uploading ? 'Pubblicazione…' : 'Pubblica'}
      </button>
    </div>
  )
}
