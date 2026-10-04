from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import WatchlistEntry
from .serializers import RegisterSerializer, WatchlistSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class WatchlistView(generics.ListAPIView):
    serializer_class = WatchlistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WatchlistEntry.objects.filter(user=self.request.user)

    def post(self, request):
        """Create or update an entry (upsert on anilist_id)."""
        ser = WatchlistSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = dict(ser.validated_data)
        anilist_id = data.pop("anilist_id")
        entry, created = WatchlistEntry.objects.update_or_create(
            user=request.user, anilist_id=anilist_id, defaults=data
        )
        return Response(WatchlistSerializer(entry).data, status=status.HTTP_201_CREATED if created else 200)


class WatchlistDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WatchlistSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "anilist_id"

    def get_queryset(self):
        return WatchlistEntry.objects.filter(user=self.request.user)
