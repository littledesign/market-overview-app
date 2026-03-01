-- ============================================================
-- Intranet Hub — Initial Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1) user_preferences: stores per-user JSON prefs (news sources, watchlist, etc.)
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  preferences jsonb default '{}',
  updated_at timestamptz default now()
);

-- 2) saved_news: bookmarked articles
create table if not exists public.saved_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text not null,
  source text,
  published_at timestamptz,
  tags text[],
  created_at timestamptz default now()
);

-- 3) quiz_attempts: completed quiz scores
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quiz_id text not null,
  score integer not null,
  answers_json jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS) — each user can only access their own rows
-- ============================================================

-- user_preferences
alter table public.user_preferences enable row level security;

create policy "Users can view their own preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id);

-- saved_news
alter table public.saved_news enable row level security;

create policy "Users can view their own saved news"
  on public.saved_news for select
  using (auth.uid() = user_id);

create policy "Users can save news articles"
  on public.saved_news for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own saved news"
  on public.saved_news for delete
  using (auth.uid() = user_id);

-- quiz_attempts
alter table public.quiz_attempts enable row level security;

create policy "Users can view their own quiz attempts"
  on public.quiz_attempts for select
  using (auth.uid() = user_id);

create policy "Users can save their own quiz attempts"
  on public.quiz_attempts for insert
  with check (auth.uid() = user_id);
