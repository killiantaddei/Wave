import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function EditProfile() {
  const { session, profile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [username, setUsername] = useState(profile?.username || '')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!session || !profile) {
    return <div className="flex h-[100dvh] items-center justify-center bg-ink text-mist">Devi accedere per modificare il profilo.</div>
  }

  function handlePickAvatar(f: File | null) {
    if (!f || !f.type.startsWith('image/')) return
    setError(null)
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSave() {
    if (!session || !profile) return
    const cleanUsername = username.trim().toLowerCase()
    
