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
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-ink px-3 text-center">
        <p className="font-display text-xl font-semibold text-white">Accedi per pubblicare</p>
        <p className="mt-2 text-sm text-mist">Devi avere un account per caricare video su Wave.</p>
        <button
          onClick={() => navigate('/auth')}
          className="mt-6 rounded-full bg-signal px-3 py-3 font-semibold text-ink"
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

  function handleRemoveFile() {
    setFile(null)
    setPreviewUrl(null)
    setError(null)
  }

  return (
    /* Aumentato il padding-bottom a pb-36 per dare spazio allo scroll sopra la barra di navigazione */
    <div 
      className="min-h-[100dvh] bg-ink px-5 pb-36"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <h1 className="font-display text-2xl font-semibold text-white">Carica un video</h1>
      <p className="text-xs text-mist mt-0.5">Condividi un momento speciale su Wave.</p>

      <div className="mx-auto mt-6 max-w-md space-y-5">
        
        {/* Box di caricamento o anteprima video */}
        {!previewUrl ? (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[9/12] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-6 text-center text-mist outline-none focus:border-signal"
          >
            <UploadCloud size={36} className="text-mist" />
            <span className="mt-3 text-sm font-medium text-white">Seleziona un file video</span>
            <span className="mt-1 text-xs text-mist/70">MP4 o formati compatibili fino a 100MB</span>
          </button>
        ) : (
          <div className="relative aspect-[9/12] w-full overflow-hidden rounded-2xl bg-black border border-line">
            <video src={previewUrl} className="h-full w-full object-contain" controls muted />
            <button
              onClick={handleRemoveFile}
              className="absolute right-3 top-3 rounded-full bg-black/60 p-1.5 text-white backdrop-blur active:scale-90 transition-transform"
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

        {/* Input Didascalia */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-mist">Didascalia del video</label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={200}
            placeholder="Scrivi qualcosa per descrivere il tuo video…"
            className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-white outline-none focus:border-signal"
          />
          <p className="mt-1 text-right text-xs text-mist">{caption.length}/200</p>
        </div>

        {error && <p className="text-xs font-medium text-flare leading-relaxed">{error}</p>}

        {/* Pulsante di pubblicazione */}
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="w-full rounded-full bg-signal py-1,5 font-semibold text-ink disabled:opacity-40 transition-opacity"
        >
          {uploading ? 'Caricamento in corso…' : 'Pubblica video'}
        </button>

      </div>
    </div>
  )
}
