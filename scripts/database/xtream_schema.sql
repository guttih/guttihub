-- xtream_schema.sql
-- Schema for storing Xtream IPTV data
-- Assumes the schema "xtream" already exists and is owned by user "guttih".
-- Run: psql -h localhost -U guttih -d guttihub -f xtream_schema.sql

-- Safety: create the schema if someone forgot (no-op if already there). Requires rights.
CREATE SCHEMA IF NOT EXISTS xtream AUTHORIZATION guttih;

-- Work inside xtream by default, but still see public.
SET search_path TO xtream, public;

-- ---------- Reset (safe drops) ----------
DROP TABLE IF EXISTS series_episodes CASCADE;
DROP TABLE IF EXISTS series_list     CASCADE;
DROP TABLE IF EXISTS vod_streams     CASCADE;
DROP TABLE IF EXISTS live_streams    CASCADE;

-- ---------- Utilities ----------
-- Simple trigger to keep `updated` current on any row change.
CREATE OR REPLACE FUNCTION touch_updated_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated := NOW();
  RETURN NEW;
END;
$$;

-- ---------- Live channels ----------
CREATE TABLE live_streams (
  stream_id           BIGINT PRIMARY KEY,
  name                TEXT NOT NULL,
  category_id         BIGINT,
  stream_icon         TEXT,
  stream_url          TEXT,           -- convenience (built URL if you want to cache it)
  added               TIMESTAMP,      -- from provider if available
  updated             TIMESTAMP NOT NULL DEFAULT NOW(),
  raw_json            JSONB           -- store original item for debugging/diffs
);

CREATE INDEX live_streams_name_idx       ON live_streams (name);
CREATE INDEX live_streams_category_idx   ON live_streams (category_id);

CREATE TRIGGER trg_live_streams_touch
BEFORE UPDATE ON live_streams
FOR EACH ROW EXECUTE FUNCTION touch_updated_column();

-- ---------- Movies (VOD) ----------
CREATE TABLE vod_streams (
  stream_id           BIGINT PRIMARY KEY,
  name                TEXT NOT NULL,
  category_id         BIGINT,
  stream_icon         TEXT,
  container_extension TEXT,
  stream_url          TEXT,
  added               TIMESTAMP,
  updated             TIMESTAMP NOT NULL DEFAULT NOW(),
  raw_json            JSONB
);

CREATE INDEX vod_streams_name_idx        ON vod_streams (name);
CREATE INDEX vod_streams_category_idx    ON vod_streams (category_id);

CREATE TRIGGER trg_vod_streams_touch
BEFORE UPDATE ON vod_streams
FOR EACH ROW EXECUTE FUNCTION touch_updated_column();

-- ---------- Series (top-level) ----------
CREATE TABLE series_list (
  series_id           BIGINT PRIMARY KEY,
  name                TEXT NOT NULL,
  category_id         BIGINT,
  cover               TEXT,
  plot                TEXT,
  release_date        DATE,
  last_modified       TIMESTAMP,      -- if the API exposes it
  updated             TIMESTAMP NOT NULL DEFAULT NOW(),
  raw_json            JSONB
);

CREATE INDEX series_list_name_idx        ON series_list (name);
CREATE INDEX series_list_category_idx    ON series_list (category_id);
CREATE INDEX series_list_lastmod_idx     ON series_list (last_modified);

CREATE TRIGGER trg_series_list_touch
BEFORE UPDATE ON series_list
FOR EACH ROW EXECUTE FUNCTION touch_updated_column();

-- ---------- Series episodes ----------
CREATE TABLE series_episodes (
  episode_id          BIGINT PRIMARY KEY,
  series_id           BIGINT NOT NULL REFERENCES series_list(series_id) ON DELETE CASCADE,
  season_number       INTEGER,
  episode_number      INTEGER,
  title               TEXT,
  container_extension TEXT,
  stream_url          TEXT,
  added               TIMESTAMP,
  updated             TIMESTAMP NOT NULL DEFAULT NOW(),
  raw_json            JSONB
);

-- Helpful lookups:
CREATE INDEX series_episodes_series_idx      ON series_episodes (series_id);
CREATE INDEX series_episodes_season_ep_idx   ON series_episodes (series_id, season_number, episode_number);
CREATE INDEX series_episodes_title_idx       ON series_episodes (title);

CREATE TRIGGER trg_series_episodes_touch
BEFORE UPDATE ON series_episodes
FOR EACH ROW EXECUTE FUNCTION touch_updated_column();
