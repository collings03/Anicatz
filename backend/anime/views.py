import ipaddress
import socket
import time
from urllib.parse import urljoin, urlparse

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import anilist

STALE_SECONDS = 24 * 3600  # how long the "last good copy" is kept for when AniList is down


def _int(value, default, lo, hi):
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default


def _cached(response, ttl, swr=None):
    """Lets Vercel's CDN (and browsers) reuse a GOOD answer, so most requests never reach Django or AniList."""
    swr = ttl * 6 if swr is None else swr
    response["Cache-Control"] = f"public, max-age=0, s-maxage={ttl}, stale-while-revalidate={swr}"
    return response


def _no_store(response):
    """Errors must never be cached by the CDN, or one failure would be served to everyone."""
    response["Cache-Control"] = "no-store"
    return response


def _guard(request, fn, *args, ttl=600):
    """Runs an AniList call. On success: CDN-cacheable answer + a stale copy saved. On failure: the stale copy, or a clean error."""
    key = "stale:" + request.get_full_path()
    try:
        data = fn(*args)
    except anilist.AniListError as exc:
        stale = cache.get(key)
        if stale is not None:
            resp = _cached(Response(stale), 30, 60)
            resp["X-Stale"] = "1"
            return resp
        busy = isinstance(exc, anilist.RateLimited)
        resp = Response({"detail": str(exc)}, status=503 if busy else 502)
        if busy:
            resp["Retry-After"] = "30"
        return _no_store(resp)
    cache.set(key, data, STALE_SECONDS)
    return _cached(Response(data), ttl)


@api_view(["GET"])
def trending(request):
    return _guard(
        request, anilist.trending,
        _int(request.GET.get("page"), 1, 1, 100), _int(request.GET.get("per_page"), 20, 1, 50),
        ttl=600,
    )


@api_view(["GET"])
def popular(request):
    return _guard(
        request, anilist.popular,
        _int(request.GET.get("page"), 1, 1, 100), _int(request.GET.get("per_page"), 20, 1, 50),
        ttl=600,
    )


@api_view(["GET"])
def search(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return Response({"detail": "q is required"}, status=400)
    return _guard(
        request, anilist.search, q,
        _int(request.GET.get("page"), 1, 1, 100), _int(request.GET.get("per_page"), 20, 1, 50),
        ttl=120,
    )


@api_view(["GET"])
def detail(request, anilist_id):
    resp = _guard(request, anilist.detail, anilist_id, ttl=3600)
    if resp.status_code == 200 and resp.data is None:
        return _no_store(Response({"detail": "Not found"}, status=404))
    return resp


@api_view(["GET"])
def recommendations(request, anilist_id):
    return _guard(request, anilist.recommendations, anilist_id, ttl=3600)


@api_view(["GET"])
def browse(request):
    g = request.GET
    sort = g.get("sort", "popular")
    status = g.get("status") or None
    fmt = g.get("format") or None
    genre = g.get("genre") or None
    if sort not in anilist.SORTS:
        return Response({"detail": "invalid sort"}, status=400)
    if status and status not in anilist.STATUSES:
        return Response({"detail": "invalid status"}, status=400)
    if fmt and fmt not in anilist.FORMATS:
        return Response({"detail": "invalid format"}, status=400)
    return _guard(
        request, anilist.browse, sort, status, fmt, genre,
        _int(g.get("page"), 1, 1, 100), _int(g.get("per_page"), 24, 1, 50),
        ttl=600,
    )


@api_view(["GET"])
def schedule(request):
    g = request.GET
    if g.get("start") or g.get("end"):
        try:
            start, end = int(g["start"]), int(g["end"])
        except (KeyError, ValueError):
            return Response({"detail": "start and end must be unix timestamps"}, status=400)
        now = int(time.time())
        if end <= start or end - start > 2 * 86400 or abs(start - now) > 120 * 86400:
            return Response({"detail": "invalid range"}, status=400)
        return _guard(request, anilist.schedule, start, end, ttl=300)
    return _guard(request, anilist.schedule, ttl=300)


# ---------------------------------------------------------------------------
# Episode checker. It makes THIS server request a URL the visitor gives it, so it must be locked down:
# otherwise anyone could use it to probe internal addresses or as a free proxy (SSRF).
# ---------------------------------------------------------------------------

_HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
}


def _url_problem(url):
    """Returns why a URL may not be fetched, or None if it is fine."""
    parts = urlparse(url)
    try:
        port = parts.port
    except ValueError:
        return "Bad port"
    host = (parts.hostname or "").lower()
    if parts.scheme not in ("http", "https") or not host:
        return "Only http(s) URLs are allowed"
    if port not in (None, 80, 443):
        return "Port not allowed"

    allowed = getattr(settings, "EPISODE_CHECK_HOSTS", [])
    if allowed and not any(host == h or host.endswith("." + h) for h in allowed):
        return "Host not allowed"

    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(host, None)}
    except socket.gaierror:
        return "Host not found"
    # Refuse private, loopback, link-local and other non-public addresses.
    if not addresses or not all(ipaddress.ip_address(a).is_global for a in addresses):
        return "Host not allowed"
    return None


@require_GET
def episode_check(request):
    url = (request.GET.get("url") or "").strip()
    if not url:
        return JsonResponse({"available": False, "error": "Missing URL"}, status=400)

    try:
        # Follow redirects by hand (max 3) so every hop is checked, not just the first URL.
        for _ in range(4):
            problem = _url_problem(url)
            if problem:
                return JsonResponse({"available": False, "error": problem}, status=400)
            r = requests.get(url, timeout=10, stream=True, allow_redirects=False, headers=_HEADERS)
            try:
                location = r.headers.get("location")
                if r.is_redirect and location:
                    url = urljoin(url, location)
                    continue
                # An HLS playlist starts with #EXTM3U, so the first few KB are enough to know.
                head = next(r.iter_content(4096), b"").decode("utf-8", "ignore")
                is_hls = r.ok and "#EXTM3U" in head
                return JsonResponse({
                    "available": r.ok and is_hls,
                    "status": r.status_code,
                    "content_type": r.headers.get("content-type", ""),
                    "is_hls": is_hls,
                })
            finally:
                r.close()
        return JsonResponse({"available": False, "error": "Too many redirects"}, status=502)
    except requests.RequestException as e:
        return JsonResponse({"available": False, "error": str(e)}, status=502)