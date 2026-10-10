
from django.urls import path

from . import views


urlpatterns = [

    # ========================================================
    # ANIME
    # ========================================================

    path(
        "anime/trending/",
        views.trending,
        name="trending",
    ),

    path(
        "anime/popular/",
        views.popular,
        name="popular",
    ),

    path(
        "anime/search/",
        views.search,
        name="search",
    ),

    path(
        "anime/schedule/",
        views.schedule,
        name="schedule",
    ),

    path(
        "anime/browse/",
        views.browse,
        name="browse",
    ),

    path(
        "anime/<int:anilist_id>/",
        views.detail,
        name="detail",
    ),

    path(
        "anime/<int:anilist_id>/recommendations/",
        views.recommendations,
        name="recommendations",
    ),

    # ========================================================
    # HLS
    # ========================================================

    path(
        "episode-check/",
        views.episode_check,
        name="episode-check",
    ),
]

