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
MAX_RETRY_WAIT = 2  # seconds: we only wait for a rate limit that clears almost at once
MAX_SCHEDULE_PAGES = 8
SCHEDULE_WORKERS = 3  # parallel page requests for one day of the schedule

# One shared session reuses the connection, so repeated calls skip the TLS handshake.
SESSION = requests.Session()


class AniListError(Exception):
    pass


class RateLimited(AniListError):
    """AniList said slow down. We stop asking for a while so we don't make the block last longer."""


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


def run(gql, variables=None):
    key = "anilist:" + hashlib.sha256(json.dumps([gql, variables], sort_keys=True).encode()).hexdigest()
    cached = cache.get(key)
    if cached is not None:
        return cached

    # Still cooling down from a recent 429: answer immediately instead of hammering AniList.
    if cache.get(COOLDOWN_KEY):
        raise RateLimited("AniList rate limit exceeded")

    for attempt in range(2):
        try:
            r = SESSION.post(URL, json={"query": gql, "variables": variables or {}}, timeout=(3.05, 8))
        except requests.RequestException as exc:
            raise AniListError(str(exc)) from exc

        if r.status_code == 429:
            try:
                wait = int(r.headers.get("Retry-After", "30"))
            except ValueError:
                wait = 30
            if attempt == 0 and wait <= MAX_RETRY_WAIT:
                time.sleep(wait)  # clears almost at once: one quick retry is fine
                continue
            # Never sleep for long inside a serverless function (it would time out): back off and fail fast.
            cache.set(COOLDOWN_KEY, True, min(max(wait, 5), 60))
            raise RateLimited("AniList rate limit exceeded")

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
            cache.set(key, data, settings.CACHE_TTL_SECONDS)
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

    def fetch(page):
        data = run(gql, {"start": start, "end": end, "page": page})
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