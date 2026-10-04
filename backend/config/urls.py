from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from accounts.views import ProfileView, ChangePasswordView
from watchlist.views import RegisterView


def home(request):
    return JsonResponse({
        "status": "online",
        "message": "AniCatz API is running",
    })


urlpatterns = [
    # API health check
    path("", home, name="home"),

    # Admin
    path("admin/", admin.site.urls),

    # Authentication
    path("api/auth/register/", RegisterView.as_view()),
    path("api/auth/token/", TokenObtainPairView.as_view()),
    path("api/auth/token/refresh/", TokenRefreshView.as_view()),
    path("api/auth/profile/", ProfileView.as_view()),
    path("api/auth/change-password/", ChangePasswordView.as_view()),

    # Anime
    path("api/", include("anime.urls")),

    # Watchlist
    path("api/", include("watchlist.urls")),
]


# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )