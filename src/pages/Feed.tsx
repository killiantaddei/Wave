import { useEffect, useRef, useState } from 'react'
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

  const scrollRef = useRef<HTMLDivElement>(null)
  const wheelLockRef = useRef(false)

  useEffect(() => {
    loadPage(0, true)
  }, [])

  // Forza lo scroll a un video per volta: ogni "tick" della rotellina/trackpad
  // sposta esattamente un'altezza di schermo, poi blocca per evitare di saltarne più di uno.
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

  async function loadPage(p: number, replace = false) {
    setLoading(true)
    const from = p * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles(*)')
      .order('created_at', { ascending: false })
      .range(from, to)

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
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - el.clientHeight * 1.5
    if (nearBottom && hasMore && !loading) {
      const next = page + 1
      setPage(next)
      loadPage(next)
    }
  }

  if (!loading && videos.length === 0) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-ink px-6 text-center">
        <p className="font-display text-xl font-semibold text-white">Ancora nessun video</p>
        <p className="mt-2 text-sm text-mist">Sii il primo a pubblicare qualcosa su Wave.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex h-[100dvh] w-full items-center justify-center bg-black md:bg-ink md:px-6">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full w-full snap-y snap-mandatory overflow-y-scroll overflow-x-hidden scroll-smooth md:my-6 md:h-[90dvh] md:max-w-[420px] md:rounded-3xl md:ring-1 md:ring-line md:shadow-2xl"
        >
          {videos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              onOpenComments={setActiveComments}
            />
          ))}
        </div>
      </div>

      {activeComments && (
        <CommentsSheet video={activeComments} onClose={() => setActiveComments(null)} />
      )}
    </>
  )
}
