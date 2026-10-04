"""Thin cached AniList GraphQL client. Retries on 429 (rate limit)."""
import datetime as dt
import hashlib
import json
import time

import requests
from django.conf import settings
from django.core.cache import cache

URL = "https://graphql.anilist.co"


class AniListError(Exception):
    pass


MEDIA_FIELDS = """
  id idMal isAdult
  title { romaji english }
  coverImage { large extraLarge color }
  bannerImage
  description(asHtml: false)
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

    for _ in range(3):
        try:
            r = requests.post(URL, json={"query": gql, "variables": variables or {}}, timeout=10)
        except requests.RequestException as exc:
            raise AniListError(str(exc)) from exc
        if r.status_code == 429:
            try:
                wait = min(int(r.headers.get("Retry-After", "2")), 10)
            except ValueError:
                wait = 2
            time.sleep(wait)
            continue
        if r.status_code == 404:
            return None

        body = r.json() if r.content else {}
        if body.get("errors"):
            msg = "; ".join(e.get("message", "unknown error") for e in body["errors"])
            raise AniListError(f"AniList error: {msg}")
        if r.status_code != 200:
            raise AniListError(f"AniList returned {r.status_code}")

        data = body.get("data")
        if data:
            cache.set(key, data, settings.CACHE_TTL_SECONDS)
        return data
    raise AniListError("AniList rate limit exceeded")


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
        pageInfo {{ hasNextPage }}
        airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {{
          airingAt episode
          media {{ {MEDIA_FIELDS} }}
        }}
      }}
    }}"""
    items = []
    for page in range(1, 9):
        data = run(gql, {"start": start, "end": end, "page": page})
        if not data:
            break
        pg = data["Page"]
        items += [s for s in pg["airingSchedules"] if s["media"] and not s["media"].get("isAdult")]
        if not pg["pageInfo"]["hasNextPage"]:
            break
    return items