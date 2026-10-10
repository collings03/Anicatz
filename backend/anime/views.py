from rest_framework.decorators import api_view
from rest_framework.response import Response

from . import anilist


def _int(value, default, lo, hi):
    try:
        return max(lo, min(hi, int(value)))
    except (TypeError, ValueError):
        return default


def _guard(fn, *args, **kwargs):
    try:
        return Response(fn(*args, **kwargs))
    except anilist.AniListError as exc:
        return Response({"detail": str(exc)}, status=502)


@api_view(["GET"])
def trending(request):
    return _guard(anilist.trending, _int(request.GET.get("page"), 1, 1, 100), _int(request.GET.get("per_page"), 20, 1, 50))


@api_view(["GET"])
def popular(request):
    return _guard(anilist.popular, _int(request.GET.get("page"), 1, 1, 100), _int(request.GET.get("per_page"), 20, 1, 50))


@api_view(["GET"])
def search(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return Response({"detail": "q is required"}, status=400)
    return _guard(anilist.search, q, _int(request.GET.get("page"), 1, 1, 100), _int(request.GET.get("per_page"), 20, 1, 50))


@api_view(["GET"])
def detail(request, anilist_id):
    try:
        media = anilist.detail(anilist_id)
    except anilist.AniListError as exc:
        return Response({"detail": str(exc)}, status=502)
    if not media:
        return Response({"detail": "Not found"}, status=404)
    return Response(media)

@api_view(["GET"])
def recommendations(request, anilist_id):
    return _guard(anilist.recommendations, anilist_id)


@api_view(["GET"])
def schedule(request):
    return _guard(anilist.schedule)


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
        anilist.browse, sort, status, fmt, genre,
        _int(g.get("page"), 1, 1, 100), _int(g.get("per_page"), 24, 1, 50),
    )

@api_view(["GET"])
def schedule(request):
    g = request.GET
    if g.get("start") or g.get("end"):
        try:
            start, end = int(g["start"]), int(g["end"])
        except (KeyError, ValueError):
            return Response({"detail": "start and end must be unix timestamps"}, status=400)
        import time
        now = int(time.time())
        if end <= start or end - start > 2 * 86400 or abs(start - now) > 120 * 86400:
            return Response({"detail": "invalid range"}, status=400)
        return _guard(anilist.schedule, start, end)
    return _guard(anilist.schedule)

import requests
from django.http import JsonResponse


def episode_check(request):
    url = request.GET.get("url")

    if not url:
        return JsonResponse({
            "available": False,
            "error": "Missing URL"
        }, status=400)

    try:
        response = requests.get(
            url,
            timeout=10,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/vnd.apple.mpegurl, application/x-mpegURL, */*",
            }
        )

        is_hls = (
            "#EXTM3U" in response.text
            if response.ok
            else False
        )

        return JsonResponse({
            "available": response.ok and is_hls,
            "status": response.status_code,
            "content_type": response.headers.get(
                "content-type", ""
            ),
            "is_hls": is_hls,
        })

    except requests.RequestException as e:
        return JsonResponse({
            "available": False,
            "error": str(e)
        }, status=502)