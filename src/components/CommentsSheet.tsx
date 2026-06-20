import { useEffect, useState } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Comment, Video } from '../lib/types'

export default function CommentsSheet({ video, onClose }: { video: Video; onClose: () => void }) {
  const { session, profile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [video.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(*)')
      .eq('video_id', video.id)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) || [])
    setLoading(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !text.trim()) return
    const content = text.trim()
    setText('')
    const { data } = await supabase
      .from('comments')
      .insert({ video_id: video.id, user_id: session.user.id, content })
      .select('*, profiles(*)')
      .single()
    if (data) setComments((c) => [...c, data as Comment])
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[75vh] w-full flex-col rounded-t-3xl bg-surface"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display font-semibold text-white">{video.comments_count} commenti</h2>
          <button onClick={onClose} className="text-mist">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading && <p className="py-6 text-center text-sm text-mist">Caricamento…</p>}
          {!loading && comments.length === 0 && (
            <p className="py-6 text-center text-sm text-mist">Nessun commento. Sii il primo!</p>
          )}
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface2">
                  {c.profiles?.avatar_url && (
                    <img src={c.profiles.avatar_url} className="h-full w-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-mist">@{c.profiles?.username}</p>
                  <p className="text-sm text-white">{c.content}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={session ? 'Aggiungi un commento…' : 'Accedi per commentare'}
            disabled={!session}
            className="flex-1 rounded-full border border-line bg-surface2 px-4 py-2.5 text-sm text-white outline-none focus:border-signal disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!session || !text.trim()}
            className="rounded-full bg-signal p-2.5 text-ink disabled:opacity-40"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  )
}
