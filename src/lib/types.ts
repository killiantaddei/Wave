export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export type Video = {
  id: string
  user_id: string
  video_url: string
  thumbnail_url: string | null
  caption: string | null
  likes_count: number
  comments_count: number
  created_at: string
  profiles?: Profile
  liked_by_me?: boolean
}

export type Comment = {
  id: string
  video_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}
