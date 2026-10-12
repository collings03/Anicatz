"""Thin cached AniList GraphQL client. Fails fast and backs off when AniList rate-limits us."""
import datetime as dt
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings
from django.core.cache import cache

URL = "https://graphql.anilist.co"
COOLDOWN_KEY = "anilist:cooldown"
LIMIT_KEY = "anilist:limit"  # AniList's own per-minute limit, learned from its response headers
MAX_RETRY_WAIT = 2  # seconds: we only wait for a rate limit that clears almost at once
MAX_SCHEDULE_PAGES = 16  # one whole week of airing episodes can need more than 8 pages of 50
SCHEDULE_WORKERS = 2  # parallel page requests for one day of the schedule (was 3: gentler on the limit)
DEFAULT_LIMIT = 60  # used until AniList tells us its real limit (it is 90, or 30 when degraded)
SAFETY_MARGIN = 8  # stay this many requests under the limit so we never trigger a real block

# One shared session reuses the connection, so repeated calls skip the TLS handshake.
SESSION = requests.Session()


class AniListError(Exception):
    pass


class RateLimited(AniListError):
    """AniList said slow down. We stop asking for a while so we don't make the block last longer.
    `retry_after` is how many seconds are really left, so visitors are not told to wait longer than needed."""

    def __init__(self, message="AniList rate limit exceeded", retry_after=30):
        super().__init__(message)
        self.retry_after = max(1, int(retry_after))


MEDIA_FIELDS = """
  id idMal isAdult
  title { romaji english }
  coverImage { large extraLarge color }
  bannerImage
  description(asHtml: false)
  episodes status format season seasonYear averageScore genres
  nextAiringEpisode { episode airingAt }
"""

# The schedule returns hundreds of rows and never shows banners or synopses, so they are left out.
# That makes AniList's answer much smaller and faster.
SCHEDULE_FIELDS = """
  id idMal isAdult
  title { romaji english }
  coverImage { large extraLarge color }
  episodes status format season seasonYear averageScore genres
  nextAiringEpisode { episode airingAt }
"""

SORTS = {
    "trending": "TRENDING_DESC",
    "popular": "POPULARITY_DESC",
    "favorite": "FAVOURITES_DESC",
    "score": "SCORE_DESC",
    "latest": "START_DATE_DESC",
}
STATUSES = {"RELEASING", "FINISHED", "NOT_YET_RELEASED"}
FORMATS = {"TV", "MOVIE", "OVA", "ONA", "SPECIAL", "TV_SHORT"}


def _budget_ok():
    """Counts the requests we send to AniList in the current minute and refuses to go over its limit.
    Better to answer from the saved copy than to be blocked, because a block lasts a full minute for everyone."""
    limit = cache.get(LIMIT_KEY) or DEFAULT_LIMIT
    bucket = f"anilist:count:{int(time.time() // 60)}"
    cache.add(bucket, 0, 75)
    try:
        used = cache.incr(bucket)
    except ValueError:  # the counter expired between add and incr
        cache.set(bucket, 1, 75)
        used = 1
    return used <= max(5, limit - SAFETY_MARGIN)


def _remember_limit(response):
    header = response.headers.get("X-RateLimit-Limit", "")
    if header.isdigit():
        cache.set(LIMIT_KEY, int(header), 3600)


def run(gql, variables=None, ttl=None):
    key = "anilist:" + hashlib.sha256(json.dumps([gql, variables], sort_keys=True).encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached

    # Still cooling down from a recent 429: answer immediately instead of hammering AniList.
    until = cache.get(COOLDOWN_KEY)
    if until:
        left = until - time.time() if isinstance(until, (int, float)) and not isinstance(until, bool) else 30
        raise RateLimited("AniList rate limit exceeded", left)

    # Out of our own per-minute budget: the caller falls back to the last saved copy.
    if not _budget_ok():
        # The budget is per calendar minute, so the wait is only until the next minute starts.
        raise RateLimited("AniList rate limit exceeded", 61 - int(time.time()) % 60)

    for attempt in range(2):
        try:
            r = SESSION.post(URL, json={"query": gql, "variables": variables or {}}, timeout=(3.05, 8))
        except requests.RequestException as exc:
            raise AniListError(str(exc)) from exc

        _remember_limit(r)

        if r.status_code == 429:
            try:
                wait = int(r.headers.get("Retry-After", "30"))
            except ValueError:
                wait = 30
            if attempt == 0 and wait <= MAX_RETRY_WAIT:
                time.sleep(wait)  # clears almost at once: one quick retry is fine
                continue
            # Never sleep for long inside a serverless function (it would time out): back off and fail fast.
            pause = min(max(wait, 5), 60)
            cache.set(COOLDOWN_KEY, time.time() + pause, pause)
            raise RateLimited("AniList rate limit exceeded", pause)

        if r.status_code == 404:
            return None

        try:
            body = r.json() if r.content else {}
        except ValueError:
            # AniList sent something that isn't JSON (e.g. an HTML error page).
            raise AniListError(f"AniList returned {r.status_code}")
        if body.get("errors"):
            msg = "; ".join(e.get("message", "unknown error") for e in body["errors"])
            raise AniListError(f"AniList error: {msg}")
        if r.status_code != 200:
            raise AniListError(f"AniList returned {r.status_code}")

        data = body.get("data")
        if data:
            cache.set(key, data, ttl or settings.CACHE_TTL_SECONDS)
        return data
    raise RateLimited("AniList rate limit exceeded")


def _list(sort, page, per_page, search=None, status=None, fmt=None, genre=None):
    """Builds the query with only the filters that are actually set,
    so we never send null variables to AniList."""
    decl = ["$page: Int", "$perPage: Int", "$sort: [MediaSort]"]
    args = ["type: ANIME", "isAdult: false", "sort: $sort"]
    variables = {"page": page, "perPage": per_page, "sort": [sort]}

    for name, gtype, value in (
        ("search", "String", search),
        ("status", "MediaStatus", status),
        ("format", "MediaFormat", fmt),
        ("genre", "String", genre),
    ):
        if value:
            decl.append(f"${name}: {gtype}")
            args.append(f"{name}: ${name}")
            variables[name] = value

    gql = (
        f"query ({', '.join(decl)}) {{ "
        f"Page(page: $page, perPage: $perPage) {{ "
        f"pageInfo {{ hasNextPage currentPage }} "
        f"media({', '.join(args)}) {{ {MEDIA_FIELDS} }} "
        f"}} }}"
    )
    data = run(gql, variables)
    if not data:
        raise AniListError("AniList returned no data")
    return data["Page"]


def trending(page=1, per_page=20):
    return _list("TRENDING_DESC", page, per_page)


def popular(page=1, per_page=20):
    return _list("POPULARITY_DESC", page, per_page)


def search(q, page=1, per_page=20):
    return _list("SEARCH_MATCH", page, per_page, search=q)


def browse(sort="popular", status=None, fmt=None, genre=None, page=1, per_page=24):
    return _list(SORTS[sort], page, per_page, status=status, fmt=fmt, genre=genre)


def detail(anilist_id):
    gql = f"query ($id: Int) {{ Media(id: $id, type: ANIME) {{ {MEDIA_FIELDS} }} }}"
    data = run(gql, {"id": anilist_id})
    return data["Media"] if data else None


def recommendations(anilist_id, per_page=12):
    gql = f"""
    query ($id: Int, $perPage: Int) {{
      Media(id: $id, type: ANIME) {{
        recommendations(sort: RATING_DESC, perPage: $perPage) {{
          nodes {{ mediaRecommendation {{ {MEDIA_FIELDS} }} }}
        }}
      }}
    }}"""
    data = run(gql, {"id": anilist_id, "perPage": per_page})
    if not data or not data.get("Media"):
        return []
    nodes = data["Media"]["recommendations"]["nodes"]
    return [
        n["mediaRecommendation"]
        for n in nodes
        if n.get("mediaRecommendation") and not n["mediaRecommendation"].get("isAdult")
    ]


def schedule(start=None, end=None, days=7):
    """Airing episodes between two unix timestamps. With no arguments it
    returns the next `days` days (used by the /schedule page)."""
    if start is None or end is None:
        now = dt.datetime.now(dt.timezone.utc)
        s = now.replace(hour=0, minute=0, second=0, microsecond=0) - dt.timedelta(days=1)
        start = int(s.timestamp())
        end = int((s + dt.timedelta(days=days + 1)).timestamp())

    gql = f"""
    query ($start: Int, $end: Int, $page: Int) {{
      Page(page: $page, perPage: 50) {{
        pageInfo {{ hasNextPage lastPage }}
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {{
          airingAt episode
          media {{ {SCHEDULE_FIELDS} }}
        }}
      }}
    }}"""

    # A day that is already over never changes again, so it is kept for hours (every date then loads from the
    # cache after the first visit). Today and the future can still change, so they use the normal short time.
    ttl = 6 * 3600 if end < time.time() - 3600 else settings.CACHE_TTL_SECONDS

    def fetch(page):
        data = run(gql, {"start": start, "end": end, "page": page}, ttl=ttl)
        return data["Page"] if data else None

    first = fetch(1)
    if not first:
        return []
    pages = [first]

    info = first["pageInfo"]
    last = info.get("lastPage")
    if last and last > 1:
        # AniList told us how many pages there are: fetch the rest at the same time instead of one by one.
        rest = range(2, min(last, MAX_SCHEDULE_PAGES) + 1)
        with ThreadPoolExecutor(max_workers=min(SCHEDULE_WORKERS, len(rest))) as pool:
            pages += [p for p in pool.map(fetch, rest) if p]
    elif info.get("hasNextPage"):
        # No page count given: walk the pages in order.
        for page in range(2, MAX_SCHEDULE_PAGES + 1):
            pg = fetch(page)
            if not pg:
                break
            pages.append(pg)
            if not pg["pageInfo"]["hasNextPage"]:
                break

    items = []
    for pg in pages:
        items += [s for s in pg["airingSchedules"] if s["media"] and not s["media"].get("isAdult")]
    items.sort(key=lambda s: s["airingAt"])
    return items