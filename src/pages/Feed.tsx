import { useEffect, useRef, useState } from 'react'
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
  
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchedVideos, setSearchedVideos] = useState<Video[]>([])
  const [searchedUsers, setSearchedUsers] = useState<Profile[]>([])
  const [activeTab, setActiveTab] = useState<'videos' | 'users'>('videos')

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
    if (searchQuery.trim() !== '') return

    const el = e.currentTarget
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
        
        {/* BARRA DI RICERCA FLOATING */}
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

        {/* CONTENUTO IN BASE ALLO STATO DI RICERCA */}
        {isSearching ? (
          <div className="w-full h-full md:max-w-[420px] bg-black text-white flex flex-col overflow-hidden pb-24">
            
            {/* TABS */}
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

            {/* RISULTATI SCROLLABILI */}
            <div className="flex-1 overflow-y-auto p-4">
              {searchLoading ? (
                <p className="text-center text-sm text-mist py-10">Ricerca in corso...</p>
              ) : (
                <>
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
                          className="relative aspect-[9/14] overflow-hidden bg-surface rounded-lg cursor-pointer group border border-white/5"
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
                          <UserPlus size={18} className="text-mist pr-1 shrink-0" />
                        </div>
                      ))}
{searchedUsers.length === 0 && (
Nessun utente trovato.
)}

)}
</>
)}

) : (
/* FEED CLASSICO A SCHERMO INTERO */

{videos.map((v) => (

<VideoCard
video={v}
muted={muted}
onToggleMute={() => setMuted((m) => !m)}
onOpenComments={setActiveComments}
/>

))}
{videos.length === 0 && !loading && (

Ancora nessun video
Sii il primo a pubblicare qualcosa su Wave.

)}

)}
{activeComments && (
<CommentsSheet video={activeComments} onClose={() => setActiveComments(null)} />
)}
</>
)
              }
