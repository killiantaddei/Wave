-- ============================================================
-- WAVE — schema Supabase completo
-- Esegui questo file in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Estensioni necessarie
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABELLE
-- ============================================================

-- Profili pubblici, collegati 1:1 a auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- Video pubblicati
create table if not exists public.videos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  video_url text not null,
  thumbnail_url text,
  caption text,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Like sui video
create table if not exists public.likes (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (video_id, user_id)
);

-- Commenti sui video
create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Follow tra utenti
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

-- Indici utili per il feed e i profili
create index if not exists videos_created_at_idx on public.videos (created_at desc);
create index if not exists videos_user_id_idx on public.videos (user_id);
create index if not exists likes_video_id_idx on public.likes (video_id);
create index if not exists comments_video_id_idx on public.comments (video_id);
create index if not exists follows_following_id_idx on public.follows (following_id);

-- ============================================================
-- TRIGGER: crea automaticamente un profilo alla registrazione
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'Nuovo utente')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TRIGGER: mantiene aggiornati i contatori like/commenti
-- ============================================================

create or replace function public.handle_like_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.videos set likes_count = likes_count + 1 where id = new.video_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.videos set likes_count = greatest(likes_count - 1, 0) where id = old.video_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.handle_like_change();

create or replace function public.handle_comment_change()
returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.videos set comments_count = comments_count + 1 where id = new.video_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.videos set comments_count = greatest(comments_count - 1, 0) where id = old.video_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_comment_change on public.comments;
create trigger on_comment_change
  after insert or delete on public.comments
  for each row execute function public.handle_comment_change();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.videos enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

-- PROFILES: leggibili da chiunque, modificabili solo dal proprietario
create policy "Profili visibili a tutti" on public.profiles for select using (true);
create policy "Utente modifica solo il proprio profilo" on public.profiles for update using (auth.uid() = id);

-- VIDEOS: leggibili da chiunque, scrivibili solo dal proprietario
create policy "Video visibili a tutti" on public.videos for select using (true);
create policy "Utente carica i propri video" on public.videos for insert with check (auth.uid() = user_id);
create policy "Utente modifica i propri video" on public.videos for update using (auth.uid() = user_id);
create policy "Utente elimina i propri video" on public.videos for delete using (auth.uid() = user_id);

-- LIKES: leggibili da chiunque, scrivibili solo dal proprietario del like
create policy "Like visibili a tutti" on public.likes for select using (true);
create policy "Utente crea i propri like" on public.likes for insert with check (auth.uid() = user_id);
create policy "Utente elimina i propri like" on public.likes for delete using (auth.uid() = user_id);

-- COMMENTS: leggibili da chiunque, scrivibili solo dal proprietario
create policy "Commenti visibili a tutti" on public.comments for select using (true);
create policy "Utente crea i propri commenti" on public.comments for insert with check (auth.uid() = user_id);
create policy "Utente elimina i propri commenti" on public.comments for delete using (auth.uid() = user_id);

-- FOLLOWS: leggibili da chiunque, scrivibili solo dal follower
create policy "Follow visibili a tutti" on public.follows for select using (true);
create policy "Utente crea i propri follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Utente elimina i propri follow" on public.follows for delete using (auth.uid() = follower_id);

-- ============================================================
-- STORAGE: bucket per video e avatar
-- ============================================================

insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Video pubblici in lettura"
  on storage.objects for select using (bucket_id = 'videos');

create policy "Utenti autenticati caricano video"
  on storage.objects for insert with check (bucket_id = 'videos' and auth.role() = 'authenticated');

create policy "Utente elimina i propri file video"
  on storage.objects for delete using (bucket_id = 'videos' and auth.uid()::text = owner::text);

create policy "Avatar pubblici in lettura"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Utenti autenticati caricano avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
