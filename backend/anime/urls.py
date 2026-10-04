from django.urls import path
from . import views

urlpatterns = [
    path("anime/trending/", views.trending),
    path("anime/popular/", views.popular),
    path("anime/search/", views.search),
    path("anime/schedule/", views.schedule),
    path("anime/<int:anilist_id>/", views.detail),
        path("anime/browse/", views.browse),
    path("anime/<int:anilist_id>/recommendations/", views.recommendations),
]