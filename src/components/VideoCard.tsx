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

  // Sincronizza l'elemento video con lo stato muto globale
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
    console.error('Errore video:', el.error, 'src:', video.video_url)
    switch (code) {
      case MediaError.MEDIA_ERR_NETWORK:
        return 'Errore di rete: il file non è raggiungibile.'
      case MediaError.MEDIA_ERR_DECODE:
        return 'Il browser non riesce a decodificare questo file (codec non supportato).'
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
        return 'URL del video non valido o inaccessibile.'
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
        /* annullato */
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
      {/* Contenitore player video */}
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
          className="h-full w-full object-contain"
        />
      </div>

      {playbackError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink px-8 text-center z-20">
          <AlertTriangle className="text-flare" size={32} />
          <p className="text-sm font-medium text-white">Questo video non può essere riprodotto</p>
          <p className="text-xs text-mist">{playbackError}</p>
        </div>
      )}

      {/* Pulsante Audio protetto da safe-top-padding */}
      <button
        onClick={onToggleMute}
        className="absolute right-4 safe-top-padding rounded-full bg-black/50 p-2.5 text-white backdrop-blur z-10 active:scale-95 transition-transform"
        aria-label="Audio"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Interfaccia Utente protetta da safe-bottom-padding */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 safe-bottom-padding z-10 pointer-events-none">
        
        {/* Testi descrittivi (Allineati a sinistra, distanziati dai bottoni per non sovrapporsi) */}
        <div className="max-w-[70%] text-left text-white flex flex-col justify-end pointer-events-auto mb-2">
          <p className="truncate font-display text-sm font-bold tracking-wide drop-shadow-md">
            @{video.profiles?.username ?? 'utente'}
          </p>
          {video.caption && (
            <p className="mt-1.5 line-clamp-3 text-xs text-white/95 leading-relaxed drop-shadow-sm">
              {video.caption}
            </p>
          )}
        </div>

        {/* Pulsanti azioni verticali (Allineati a destra) */}
        <div className="flex shrink-0 flex-col items-center gap-5 pointer-events-auto mb-2 pl-2">
          <button onClick={toggleLike} className="flex flex-col items-center gap-1 text-white active:scale-90 transition-transform">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm">
              <Heart size={26} className={liked ? 'fill-flare text-flare' : 'text-white'} />
            </div>
            <span className="text-[11px] font-semibold drop-shadow-md">{likesCount}</span>
          </button>
          
          <button onClick={() => onOpenComments(video)} className="flex flex-col items-center gap-1 text-white active:scale-90 transition-transform">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm">
              <MessageCircle size={26} />
            </div>
            <span className="text-[11px] font-semibold drop-shadow-md">{video.comments_count}</span>
          </button>
          
          <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white active:scale-90 transition-transform">
            <div className="p-2 bg-black/20 rounded-full backdrop-blur-sm">
              <Share2 size={24} />
            </div>
            <span className="text-[11px] font-semibold drop-shadow-md">Condividi</span>
          </button>
        </div>

      </div>
    </div>
  )
}
