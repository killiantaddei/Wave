import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Video } from '../lib/types'
import VideoCard from '../components/VideoCard'
import CommentsSheet from '../components/CommentsSheet'

const PAGE_SIZE = 5

export default function Feed() {
  const { session } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [activeComments, setActiveComments] = useState<Video | null>(null)
  const [muted, setMuted] = useState(true)
  
  // Stati per la gestione della ricerca locale
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchActive, setIsSearchActive] = useState(false)

  // Seme casuale persistente per la sessione
  const [seed] = useState(() => Math.random())

  const scrollRef = useRef<HTMLDivElement>(null)
  const wheelLockRef = useRef(false)

  useEffect(() => {
    loadPage(0, true, seed)
  }, [seed])

  useEffect(() => {
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
  }, [])

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
    // Se l'utente sta cercando, disabilitiamo l'infinite scroll per non mescolare dati diversi
    if (searchQuery.trim() !== '') return

    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * 1.5
    if (nearBottom && hasMore && !loading) {
      const next = page + 1
      setPage(next)
      loadPage(next)
    }
  }

  // Filtra l'array dei video in base al testo inserito dall'utente
  const filteredVideos = videos.filter((v) => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return true
    
    const usernameMatch = v.profiles?.username?.toLowerCase().includes(query)
    const captionMatch = v.caption?.toLowerCase().includes(query)
    
    return usernameMatch || captionMatch
  })

  return (
    <>
      <div className="flex h-[100dvh] w-full items-center justify-center bg-black md:bg-ink md:px-6 relative">
        
        {/* BARRA DI RICERCA FLOATING IN ALTO (Stile TikTok/Instagram) */}
        <div 
          className="absolute left-0 right-0 z-30 px-4 md:max-w-[420px] md:left-auto md:right-auto w-full transition-all duration-300"
          style={{ top: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}
        >
          <div className="relative flex items-center w-full bg-black/40 backdrop-blur-md rounded-full border border-white/10 px-3.5 py-2">
            <Search size={18} className="text-mist shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca utenti o didascalie..."
              className="w-full bg-transparent pl-2.5 pr-8 text-sm text-white placeholder-mist outline-none"
              onFocus={() => setIsSearchActive(true)}
              onBlur={() => {
                if (searchQuery === '') setIsSearchActive(false)
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 text-mist hover:text-white p-0.5"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* FEED DEI VIDEO */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full w-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden scroll-smooth md:my-6 md:h-[90dvh] md:max-w-[420px] md:rounded-3xl md:ring-1 md:ring-line md:shadow-2xl"
        >
          {filteredVideos.map((v) => (
            <div key={v.id} className="video-snap-item">
              <VideoCard
                video={v}
                muted={muted}
                onToggleMute={() => setMuted((m) => !m)}
                onOpenComments={setActiveComments}
              />
            </div>
          ))}

          {/* Schermata se la ricerca non produce risultati */}
          {filteredVideos.length === 0 && !loading && (
            <div className="flex h-full w-full flex-col items-center justify-center bg-black px-6 text-center">
              <p className="font-display text-base font-semibold text-white">Nessun risultato trovato</p>
              <p className="mt-1 text-xs text-mist">Prova a cercare un termine o un nome utente differente.</p>
            </div>
          )}
        </div>
      </div>

      {activeComments && (
        <CommentsSheet video={activeComments} onClose={() => setActiveComments(null)} />
      )}
    </>
  )
}
