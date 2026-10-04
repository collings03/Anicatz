from django.urls import path
from . import views

urlpatterns = [
    path("watchlist/", views.WatchlistView.as_view()),
    path("watchlist/<int:anilist_id>/", views.WatchlistDetailView.as_view()),
]
