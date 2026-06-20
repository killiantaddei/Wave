tsximport { useEffect, useRef, useState } from 'react'
import { Search, X, Play, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Video, Profile } from '../lib/types'
import VideoCard from '../components/VideoCard'
import CommentsSheet from '../components/CommentsSheet'
import { useNavigate } from 'react-router-dom'

const PAGE_SIZE = 5

export default function Feed() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeComments, setActiveComments] = useState<Video | null>(null)
  const [muted, setMuted] = useState(true)
  
  // Stati per la ricerca reale globale
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchedVideos, setSearchedVideos] = useState<Video[]>([])
  const [searchedUsers, setSearchedUsers] = useState<Profile[]>([])
  const [activeTab, setActiveTab] = useState<'videos' | 'users'>('videos')

  // Seme casuale persistente per la sessione del feed classico
  const [seed] = useState(() => Math.random())

  const scrollRef = useRef<HTMLDivElement>(null)
  const wheelLockRef = useRef(false)

  useEffect(() => {
    loadPage(0, true, seed)
  }, [seed])

  useEffect(() => {
    if (searchQuery.trim() !== '') return

    const container = scrollRef.current
    if (!container) return

    function onWheel(e: WheelEvent) {
      e.preventDefault()
      if (wheelLockRef.current) return
      const c = scrollRef.current
      if (!c) return
      const direction = e.deltaY > 0 ? 1 : -1
      wheelLockRef.current = true
      c.scrollTo({ top: c.scrollTop + direction * c.clientHeight, behavior: 'smooth' })
      window.setTimeout(() => {
        wheelLockRef.current = false
      }, 650)
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [searchQuery])

  async function loadPage(p: number, replace = false, currentSeed = seed) {
    setLoading(true)
    const from = p * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .rpc('get_seeded_random_videos', {
        seed: currentSeed,
        page_from: from,
        page_to: to
      })
      .select('*, profiles(*)')

    if (!error && data) {
      let withLikes = data as Video[]
      if (session?.user) {
        const ids = withLikes.map((v) => v.id)
        const { data: likedRows } = await supabase
          .from('likes')
          .select('video_id')
          .eq('user_id', session.user.id)
          .in('video_id', ids)
        const likedSet = new Set((likedRows || []).map((r) => r.video_id))
        withLikes = withLikes.map((v) => ({ ...v, liked_by_me: likedSet.has(v.id) }))
      }
      setVideos((prev) => (replace ? withLikes : [...prev, ...withLikes]))
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoading(false)
  }

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget
    if (searchQuery.trim() !== '') return

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * 1.5
    if (nearBottom && hasMore && !loading) {
      const next = page + 1
      setPage(next)
      loadPage(next)
    }
  }

  async function handleSearch(text: string) {
    setSearchQuery(text)
    const cleanText = text.trim()

    if (cleanText === '') {
      setIsSearching(false)
      setSearchedVideos([])
      setSearchedUsers([])
      return
    }

    setIsSearching(true)
    setSearchLoading(true)

    try {
      const [videoResult, userResult] = await Promise.all([
        supabase
          .from('videos')
          .select('*, profiles(*)')
          .ilike('caption', `%${cleanText}%`)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${cleanText}%,display_name.ilike.%${cleanText}%`)
          .limit(20)
      ])

      if (videoResult.data) setSearchedVideos(videoResult.data as Video[])
      if (userResult.data) setSearchedUsers(userResult.data as Profile[])
    } catch (err) {
      console.error('Errore durante la ricerca:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  function handleClearSearch() {
    setSearchQuery('')
    setIsSearching(false)
    setSearchedVideos([])
    setSearchedUsers([])
  }

  return (
    <>
      <div className="flex h-[100dvh] w-full flex-col items-center justify-start bg-black md:bg-ink md:px-6 relative overflow-hidden">
        
        {/* BARRA DI RICERCA FLOATING IN ALTO */}
        <div 
          className="w-full px-4 md:max-w-[420px] z-30 shrink-0"
          style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
        >
          <div className="relative flex items-center w-full bg-surface2/60 backdrop-blur-md rounded-full border border-white/10 px-3.5 py-2">
            <Search size={18} className="text-mist shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cerca utenti o video..."
              className="w-full bg-transparent pl-2.5 pr-8 text-sm text-white placeholder-mist outline-none"
            />
            {searchQuery && (
              <button 
                onClick={handleClearSearch}
                className="absolute right-3.5 text-mist hover:text-white p-0.5"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* LOGICA VISUALIZZAZIONE SCHERMATE */}
        {isSearching ? (
          <div className="w-full h-full md:max-w-[420px] bg-black text-white flex flex-col overflow-hidden pb-24">
            
            {/* SELETTORE TAB */}
            <div className="flex border-b border-line shrink-0">
              <button
                onClick={() => setActiveTab('videos')}
                className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                  activeTab === 'videos' ? 'border-b-2 border-signal text-white' : 'text-mist'
                }`}
              >
                Video ({searchedVideos.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex-1 py-3 text-center text-sm font-semibold transition-colors ${
                  activeTab === 'users' ? 'border-b-2 border-signal text-white' : 'text-mist'
                }`}
              >
                Utenti ({searchedUsers.length})
              </button>
            </div>

            {/* AREA RISULTATI */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchLoading ? (
                <p className="text-center text-sm text-mist py-10">Ricerca in corso...</p>
              ) : (
                <>
                  {/* GRIGLIA VIDEO */}
                  {activeTab === 'videos' && (
                    <div className="grid grid-cols-3 gap-1">
                      {searchedVideos.map((v) => (
                        <div 
                          key={v.id} 
                          onClick={() => {
                            setVideos([v])
                            setIsSearching(false)
                            setSearchQuery('')
                          }}
                          className="relative aspect-[9/14] overflow-hidden bg-surface rounded-lg cursor-pointer border border-white/5"
                        >
                          <video src={v.video_url} className="h-full w-full object-cover" muted />
                          <div className="absolute inset-0 bg-black/20 flex flex-col justify-between p-2">
                            <Play size={14} className="text-white drop-shadow-md opacity-80" />
                            <p className="text-[10px] text-white truncate drop-shadow-md font-medium">
                              @{v.profiles?.username}
                            </p>
                          </div>
                        </div>
                      ))}
                      {searchedVideos.length === 0 && (
                        <p className="col-span-3 py-14 text-center text-xs text-mist">Nessun video trovato.</p>
                      )}
                    </div>
                  )}

                  {/* LISTA UTENTI */}
                  {activeTab === 'users' && (
                    <div className="space-y-4">
                      {searchedUsers.map((u) => (
                        <div 
                          key={u.id}
                          onClick={() => navigate(`/profile/${u.id}`)}
                          className="flex items-center justify-between p-2 bg-surface/40 rounded-xl border border-line/5 active:bg-surface/80 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface2 ring-1 ring-line">
                              {u.avatar_url && <img src={u.avatar_url} className="h-full w-full object-cover" />}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-sm font-semibold text-white truncate">@{u.username}</p>
                              <p className="text-xs text-mist truncate">{u.display_name || u.username}</p>
                            </div>
                          </div>
Usa il codice con cautela.))}{searchedUsers.length === 0 && (Nessun utente trovato.)})}</>)}) : (/* INTERFACCIA FEED CLASSICO */{videos.map((v) => (<VideoCardvideo={v}muted={muted}onToggleMute={() => setMuted((m) => !m)}onOpenComments={setActiveComments}/>))}{videos.length === 0 && !loading && (Ancora nessun videoSii il primo a pubblicare qualcosa su Wave.)})}{activeComments && (<CommentsSheet video={activeComments} onClose={() => setActiveComments(null)} />)}</>)}
---

### 3. La singola card video (`VideoCard.tsx`)
Usa `object-contain` per adattare i video orizzontali senza tagliarli. Separa rigidamente i blocchi di interfaccia (testo a sinistra, bottoni a destra) per non coprire il centro del video.

```tsx
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
    switch (code) {
      case MediaError.MEDIA_ERR_NETWORK:
        return 'Errore di rete: il file non è raggiungibile.'
      case MediaError.MEDIA_ERR_DECODE:
        return 'Il browser non riesce a decodificare questo file.'
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
      } catch {}
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  return (
    <div ref={containerRef} className="relative h-full w-full flex items-center justify-center bg-black overflow-hidden">
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

      <button
        onClick={onToggleMute}
        className="absolute right-4 safe-top-padding rounded-full bg-black/50 p-2.5 text-white backdrop-blur z-10 active:scale-95 transition-transform"
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/90 via-black/40 to-transparent px-4 safe-bottom-padding z-10 pointer-events-none">
        <div className="max-w-[70%] text-left text-white flex flex-col justify-end pointer-events-auto mb-2">
          <p className="truncate font-display text-sm font-bold tracking-wide drop-shadow-md">
            @{video.profiles?.username ?? 'utente'}
          </p>
          {video.caption && (
            <p className="mt-1.5 line-clamp-3 text-xs text-white/95 leading-relaxed drop-shadow-sm">{video.caption}</p>
          )}
        </div>

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
