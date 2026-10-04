from django.http import JsonResponse
from django.contrib import admin
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static


def home(request):
    return JsonResponse({
        "status": "online",
        "message": "AniCatz API is running",
    })


urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),

    path("api/auth/", include("accounts.urls")),
    path("api/", include("anime.urls")),
    path("api/", include("watchlist.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
