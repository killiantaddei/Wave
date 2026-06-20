import { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Share2, Volume2, VolumeX, AlertTriangle } from 'lucide-react'
import type { Video } from '../lib/types'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function VideoCard({
  video,
  muted,
  onToggleMute,
  onOpenComments,
}: {
  video: Video
  muted: boolean
  onToggleMute: () => void
  onOpenComments: (video: Video) => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { session } = useAuth()
  const [liked, setLiked] = useState(!!video.liked_by_me)
  const [likesCount, setLikesCount] = useState(video.likes_count)
  const [playbackError, setPlaybackError] = useState<string | null>(null)

  // Tiene l'elemento <video> sincronizzato con lo stato globale del mute,
  // così resta smutato (o muto) quando l'utente scorre su un nuovo video.
  useEffect(() => {
    if (ref.current) ref.current.muted = muted
  }, [muted])

  useEffect(() => {
    const el = ref.current
    const container = containerRef.current
    if (!el || !container) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            el.play().catch((err) => {
              // eslint-disable-next-line no-console
              console.warn('Riproduzione bloccata dal browser:', err)
            })
          } else {
            el.pause()
          }
        })
      },
      { threshold: [0, 0.6, 1] }
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  function describeError(el: HTMLVideoElement): string {
    const code = el.error?.code
    // eslint-disable-next-line no-console
    console.error('Errore video:', el.error, 'src:', video.video_url)
    switch (code) {
      case MediaError.MEDIA_ERR_NETWORK:
        return 'Errore di rete: il file non è raggiungibile (controlla che il bucket "videos" sia pubblico).'
      case MediaError.MEDIA_ERR_DECODE:
        return 'Il browser non riesce a decodificare questo file (codec non supportato).'
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'URL del video non valido o inaccessibile (404 o permessi mancanti sul bucket).'
      default:
        return 'Errore sconosciuto nella riproduzione del video.'
    }
  }

  async function toggleLike() {
    if (!session) return
    if (liked) {
      setLiked(false)
      setLikesCount((c) => c - 1)
      await supabase.from('likes').delete().eq('video_id', video.id).eq('user_id', session.user.id)
    } else {
      setLiked(true)
      setLikesCount((c) => c + 1)
      await supabase.from('likes').insert({ video_id: video.id, user_id: session.user.id })
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/video/${video.id}`
    if (navigator.share) {
      try {
        await navigator.share({ url })
      } catch {
        /* utente ha annullato */
      }
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-black overflow-hidden"
    >
      {/* Contenitore interno strutturato che sfrutta le classi CSS personalizzate */}
      <div className="video-player-container w-full h-full flex items-center justify-center">
        <video
          ref={ref}
          src={video.video_url}
          poster={video.thumbnail_url || undefined}
          loop
          muted={muted}
          playsInline
          preload="auto"
          onClick={() => (ref.current?.paused ? ref.current.play() : ref.current?.pause())}
          onError={(e) => setPlaybackError(describeError(e.currentTarget))}
          /* Sostituito object-cover con object-contain per evitare ritagli su mobile */
          className="h-full w-full object-contain"
        />
      </div>

      {playbackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink px-8 text-center z-20">
          <AlertTriangle className="text-flare" size={32} />
          <p className="text-sm font-medium text-white">Questo video non può essere riprodotto</p>
          <p className="text-xs text-mist">{playbackError}</p>
          <p className="break-all text-[10px] text-mist/60">{video.video_url}</p>
        </div>
      )}

      <button
        onClick={onToggleMute}
        className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white backdrop-blur z-10"
        aria-label="Audio"
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>

      {/* Interfaccia utente (Pulsanti, Nome Utente, Didascalia) */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 pb-6 z-10 pointer-events-none">
        
        {/* Testi descrittivi (allineati a sinistra per non coprire il centro del video orizzontale) */}
        <div className="max-w-[75%] text-left text-white flex flex-col justify-end pointer-events-auto">
          <p className="truncate font-display text-sm font-semibold">
            @{video.profiles?.username ?? 'utente'}
          </p>
          {video.caption && (
            <p className="mt-1 line-clamp-2 text-sm text-white/90">{video.caption}</p>
          )}
        </div>

        {/* Pulsanti azioni verticali (allineati a destra) */}
        <div className="flex shrink-0 flex-col items-center gap-5 pointer-events-auto">
          <button onClick={toggleLike} className="flex flex-col items-center gap-1 text-white active:scale-90">
            <Heart size={28} className={liked ? 'fill-flare text-flare' : 'text-white'} />
            <span className="text-xs font-medium">{likesCount}</span>
          </button>
          <button
            onClick={() => onOpenComments(video)}
            className="flex flex-col items-center gap-1 text-white active:scale-90"
          >
            <MessageCircle size={28} />
            <span className="text-xs font-medium">{video.comments_count}</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white active:scale-90">
            <Share2 size={26} />
          </button>
        </div>

      </div>
    </div>
  )
}
