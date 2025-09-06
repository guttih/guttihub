# scripts/fetch_xtream_to_pg.py
"""
Imports Xtream (player_api.php) data into Postgres tables:
  xtream.live_streams, xtream.vod_streams, xtream.series_list, xtream.series_episodes

Usage:
  export PGHOST=localhost PGUSER=guttih PGPASSWORD=... PGDATABASE=guttihub
  python3 scripts/fetch_xtream_to_pg.py --base http://m3u.best-smarter.me --user 7d... --pass qx...

Options:
  --concurrency  default 16  (parallel get_series_info fetches)
  --timeout      default 20s
"""
import asyncio
import os
import json
import argparse
import aiohttp
import psycopg2
import psycopg2.extras
import socket
import asyncio
import time
from datetime import datetime

UA = "TiviMate/4.8 (Android TV)"

def get_conn():
    dsn = "host={} dbname={} user={} password={}".format(
        os.getenv("PGHOST","localhost"),
        os.getenv("PGDATABASE","guttihub"),
        os.getenv("PGUSER","guttih"),
        os.getenv("PGPASSWORD","")
    )
    return psycopg2.connect(dsn)

def upsert_live(cur, base, u, p, items):
    sql = """
    INSERT INTO xtream.live_streams(stream_id, name, category_id, stream_icon, stream_url, added, raw_json)
    VALUES (%(stream_id)s, %(name)s, %(category_id)s, %(stream_icon)s, %(stream_url)s, %(added)s, %(raw_json)s)
    ON CONFLICT (stream_id) DO UPDATE SET
      name = EXCLUDED.name,
      category_id = EXCLUDED.category_id,
      stream_icon = EXCLUDED.stream_icon,
      stream_url = EXCLUDED.stream_url,
      added = EXCLUDED.added,
      raw_json = EXCLUDED.raw_json,
      updated = NOW();
    """
    data = []
    for it in items:
        sid = int(it.get("stream_id"))
        data.append({
            "stream_id": sid,
            "name": it.get("name"),
            "category_id": int(it.get("category_id") or 0) or None,
            "stream_icon": it.get("stream_icon"),
            "stream_url": f"{base}/live/{u}/{p}/{sid}.m3u8",
            "added": ts_or_none(it.get("added")),
            "raw_json": psycopg2.extras.Json(it),
        })
    psycopg2.extras.execute_batch(cur, sql, data, page_size=1000)

def upsert_vod(cur, base, u, p, items):
    sql = """
    INSERT INTO xtream.vod_streams(
        stream_id, name, category_id, stream_icon,
        container_extension, stream_url, added, raw_json
    )
    VALUES (
        %(stream_id)s, %(name)s, %(category_id)s, %(stream_icon)s,
        %(container_extension)s, %(stream_url)s, %(added)s, %(raw_json)s
    )
    ON CONFLICT (stream_id) DO UPDATE SET
      name                = EXCLUDED.name,
      category_id         = EXCLUDED.category_id,
      stream_icon         = EXCLUDED.stream_icon,
      container_extension = EXCLUDED.container_extension,
      stream_url          = EXCLUDED.stream_url,
      added               = EXCLUDED.added,
      raw_json            = EXCLUDED.raw_json,
      updated             = NOW();
    """
    data = []
    for it in items:
        sid = int(it.get("stream_id"))
        ext = (it.get("container_extension") or "m3u8").lstrip(".")
        data.append({
            "stream_id": sid,
            "name": it.get("name"),
            "category_id": int(it.get("category_id") or 0) or None,
            "stream_icon": it.get("stream_icon"),
            "container_extension": ext,
            "stream_url": f"{base}/movie/{u}/{p}/{sid}.{ext}",
            "added": ts_or_none(it.get("added")),
            "raw_json": psycopg2.extras.Json(it),
        })
    psycopg2.extras.execute_batch(cur, sql, data, page_size=1000)


def upsert_series_list(cur, items):
    sql = """
    INSERT INTO xtream.series_list(series_id, name, category_id, cover, plot, release_date, last_modified, raw_json)
    VALUES (%(series_id)s, %(name)s, %(category_id)s, %(cover)s, %(plot)s, %(release_date)s, %(last_modified)s, %(raw_json)s)
    ON CONFLICT (series_id) DO UPDATE SET
      name = EXCLUDED.name,
      category_id = EXCLUDED.category_id,
      cover = EXCLUDED.cover,
      plot = EXCLUDED.plot,
      release_date = EXCLUDED.release_date,
      last_modified = EXCLUDED.last_modified,
      raw_json = EXCLUDED.raw_json,
      updated = NOW();
    """
    data = []
    for it in items:
        data.append({
            "series_id": int(it.get("series_id")),
            "name": it.get("name"),
            "category_id": int(it.get("category_id") or 0) or None,
            "cover": it.get("cover"),
            "plot": it.get("plot"),
            "release_date": date_or_none(it.get("releaseDate") or it.get("releaseDate2") or it.get("release_date")),
            "last_modified": ts_or_none(it.get("last_modified")),
            "raw_json": psycopg2.extras.Json(it),
        })
    psycopg2.extras.execute_batch(cur, sql, data, page_size=1000)

def upsert_series_episodes(cur, base, u, p, series_info):
    episodes = []
    eps = series_info.get("episodes") or {}
    for _, arr in eps.items():
        if isinstance(arr, list):
            episodes.extend(arr)
    if not episodes:
        return

    sql = """
    INSERT INTO xtream.series_episodes(
        episode_id, series_id, season_number, episode_number,
        title, container_extension, stream_url, added, raw_json
    )
    VALUES (
        %(episode_id)s, %(series_id)s, %(season_number)s, %(episode_number)s,
        %(title)s, %(container_extension)s, %(stream_url)s, %(added)s, %(raw_json)s
    )
    ON CONFLICT (episode_id) DO UPDATE SET
      series_id           = EXCLUDED.series_id,
      season_number       = EXCLUDED.season_number,
      episode_number      = EXCLUDED.episode_number,
      title               = EXCLUDED.title,
      container_extension = EXCLUDED.container_extension,
      stream_url          = EXCLUDED.stream_url,
      added               = EXCLUDED.added,
      raw_json            = EXCLUDED.raw_json,
      updated             = NOW();
    """
    data = []
    sid = int((series_info.get("info") or {}).get("series_id") or series_info.get("series_id") or 0) or None
    for e in episodes:
        eid = int(e.get("id"))
        season = int(e.get("season") or 0) or None
        epnum  = int(e.get("episode_num") or 0) or None
        title  = e.get("title")
        ext    = (e.get("container_extension") or "m3u8").lstrip(".")
        url    = f"{base}/series/{u}/{p}/{eid}.{ext}"
        data.append({
            "episode_id": eid,
            "series_id": sid,
            "season_number": season,
            "episode_number": epnum,
            "title": title,
            "container_extension": ext,
            "stream_url": url,
            "added": ts_or_none(e.get("added")),
            "raw_json": psycopg2.extras.Json(e),
        })
    psycopg2.extras.execute_batch(cur, sql, data, page_size=1000)

def ts_or_none(v):
    # accepts unix timestamp (string/int) or ISO-ish, else None
    if v in (None, "", "0"): return None
    try:
        iv = int(str(v))
        if iv > 0:
            return datetime.utcfromtimestamp(iv)
    except Exception:
        pass
    try:
        return datetime.fromisoformat(str(v).replace("Z",""))
    except Exception:
        return None

def date_or_none(v):
    if not v: return None
    try:
        return datetime.fromisoformat(str(v)).date()
    except Exception:
        try:
            return datetime.strptime(str(v), "%Y-%m-%d").date()
        except Exception:
            return None

async def fetch_json(session, url, timeout, retries=5, backoff=0.8):
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            async with session.get(url, headers={"User-Agent": UA}, timeout=timeout) as r:
                r.raise_for_status()
                return await r.json(content_type=None)
        except (asyncio.TimeoutError, aiohttp.ClientError) as e:
            last_err = e
            if attempt == retries:
                raise
            await asyncio.sleep(backoff * (2 ** (attempt - 1)))
    raise last_err  # just in case


async def fetch_all(args):
    base = args.base.rstrip("/")
    u = args.user
    p = args.pwd
    timeout = aiohttp.ClientTimeout(total=args.timeout)
    connector = aiohttp.TCPConnector(
    limit_per_host=args.concurrency,
    ttl_dns_cache=120,
    family=socket.AF_INET,          # avoid IPv6 / happy-eyeballs flapping
    force_close=True,
    enable_cleanup_closed=True,
)

    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        # live
        live  = await fetch_json(session, f"{base}/player_api.php?username={u}&password={p}&action=get_live_streams", timeout, args.retries, args.backoff)
        # vod
        vod   = await fetch_json(session, f"{base}/player_api.php?username={u}&password={p}&action=get_vod_streams", timeout, args.retries, args.backoff)
        # series list
        slist = await fetch_json(session, f"{base}/player_api.php?username={u}&password={p}&action=get_series", timeout, args.retries, args.backoff)

        # series info (parallel)
        series_ids = [int(x["series_id"]) for x in slist]
        sem = asyncio.Semaphore(args.concurrency)

        async def one(sid):
            url = f"{base}/player_api.php?username={u}&password={p}&action=get_series_info&series_id={sid}"
            async with sem:
                try:
                    data = await fetch_json(session, url, timeout, args.retries, args.backoff)
                    return sid, data
                except Exception as e:
                    return sid, {"_error": str(e)}

        results = []
        for chunk_start in range(0, len(series_ids), 500):
            chunk = series_ids[chunk_start:chunk_start+500]
            results += await asyncio.gather(*(one(s) for s in chunk))

        return live, vod, slist, results

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--user", required=True)
    ap.add_argument("--pass", dest="pwd", required=True)
    ap.add_argument("--concurrency", type=int, default=16)
    ap.add_argument("--timeout", type=int, default=60)      # was 20; server is sluggish
    ap.add_argument("--retries", type=int, default=5)
    ap.add_argument("--backoff", type=float, default=0.8)   # seconds, exponential
    args = ap.parse_args()

    live, vod, slist, series_results = asyncio.run(fetch_all(args))

    conn = get_conn()
    conn.autocommit = False
    cur = conn.cursor()

    # live
    upsert_live(cur, args.base, args.user, args.pwd, live)
    # vod
    upsert_vod(cur, args.base, args.user, args.pwd, vod)
    # series list
    upsert_series_list(cur, slist)

    # episodes
    ok = 0; errs = 0
    for sid, info in series_results:
        if info and "_error" not in info:
            upsert_series_episodes(cur, args.base, args.user, args.pwd, info)
            ok += 1
        else:
            errs += 1
    conn.commit()
    cur.close(); conn.close()

    print(f"Imported live={len(live)} vod={len(vod)} series={len(slist)} series_info_ok={ok} errors={errs}")

if __name__ == "__main__":
    main()
