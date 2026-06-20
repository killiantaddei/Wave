import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LogOut, Play, Pencil } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Profile, Video } from '../lib/types'

export default function ProfilePage() {
  const { userId } = useParams()
  const { session, profile: myProfile, signOut } = useAuth()
  const navigate = useNavigate()

  const targetId = userId || session?.user.id
  const isMe = !userId || userId === session?.user.id

  const [profile, setProfile] = useState<Profile | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (targetId) load(targetId)
  }, [targetId])

  async function load(id: string) {
    setLoading(true)
    const [{ data: p }, { data: v }, { count: fCount }, { count: gCount }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('videos').select('*').eq('user_id', id).order('created_at', { ascending: false }),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', id),
    ])

    setProfile(p as Profile)
    setVideos((v as Video[]) || [])
    setFollowers(fCount || 0)
    setFollowing(gCount || 0)

    if (session?.user && session.user.id !== id) {
      const { data: f } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', session.user.id)
        .eq('following_id', id)
        .maybeSingle()
      setIsFollowing(!!f)
    }
    setLoading(false)
  }

  async function toggleFollow() {
    if (!session || !targetId) return
    if (isFollowing) {
      setIsFollowing(false)
      setFollowers((c) => c - 1)
      await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', targetId)
    } else {
      setIsFollowing(true)
      setFollowers((c) => c + 1)
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: targetId })
    }
  }

  if (loading) {
    return <div className="flex h-[100dvh] items-center justify-center bg-ink text-mist">Caricamento…</div>
  }

  if (!profile) {
    return <div className="flex h-[100dvh] items-center justify-center bg-ink text-mist">Profilo non trovato.</div>
  }

  return (
    /* Modificato il padding top per agganciarsi al limite assoluto superiore del telefono */
    <div 
      className="min-h-[100dvh] bg-ink px-5 pb-28"
      style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
    >
      <div className="flex items-center justify-between">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-surface2 ring-1 ring-line">
          {profile.avatar_url && <img src={profile.avatar_url} className="h-full w-full object-cover" />}
        </div>
        {isMe ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/profile/edit')}
              className="flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm font-medium text-white"
            >
              <Pencil size={14} /> Modifica profilo
            </button>
            <button onClick={() => signOut().then(() => navigate('/auth'))} className="flex items-center gap-1.5 text-sm text-mist">
              <LogOut size={16} /> Esci
            </button>
          </div>
        ) : (
          <button
            onClick={toggleFollow}
            className={`rounded-full px-5 py-2 text-sm font-semibold ${
              isFollowing ? 'border border-line text-white' : 'bg-signal text-ink'
            }`}
          >
            {isFollowing ? 'Segui già' : 'Segui'}
          </button>
        )}
      </div>

      <h1 className="mt-4 font-display text-xl font-semibold text-white">
        {profile.display_name || profile.username}
      </h1>
      <p className="text-sm text-mist">@{profile.username}</p>
      {profile.bio && <p className="mt-2 text-sm text-white/90">{profile.bio}</p>}

      <div className="mt-4 flex gap-6 text-sm">
        <span className="text-white"><b>{videos.length}</b> <span className="text-mist">video</span></span>
        <span className="text-white"><b>{followers}</b> <span className="text-mist">follower</span></span>
        <span className="text-white"><b>{following}</b> <span className="text-mist">seguiti</span></span>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-1">
        {videos.map((v) => (
          <div key={v.id} className="relative aspect-[9/14] overflow-hidden bg-surface2">
            <video src={v.video_url} className="h-full w-full object-cover" muted />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0">
              <Play size={18} className="text-white/0" />
            </div>
          </div>
        ))}
        {videos.length === 0 && (
          <p className="col-span-3 py-10 text-center text-sm text-mist">Nessun video pubblicato.</p>
        )}
      </div>
    </div>
  )
}
