-- ============================================================================
-- Migration: add reading progress to profiles
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to run on your existing project; it only adds a column.
-- ============================================================================

alter table public.profiles
  add column if not exists reading_progress smallint not null default 0
    check (reading_progress between 0 and 100);
