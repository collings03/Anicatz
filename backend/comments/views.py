# backend/comments/views.py
from django.db.models import Prefetch
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.throttling import UserRateThrottle

from .models import Comment
from .serializers import CommentSerializer


class CommentPagination(PageNumberPagination):
    page_size = 20


class PostThrottle(UserRateThrottle):
    rate = "20/min"  # stops comment spam


class CommentListCreate(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = CommentPagination

    def get_throttles(self):
        return [PostThrottle()] if self.request.method == "POST" else []

    def get_queryset(self):
        anime = self.request.query_params.get("anime")
        if not anime or not anime.isdigit():
            raise ValidationError({"anime": "Required."})
        episode = self.request.query_params.get("episode")

        qs = (
            Comment.objects.filter(anime_id=int(anime), parent__isnull=True)
            .select_related("user__profile")
            .prefetch_related(
                Prefetch(
                    "replies",
                    queryset=Comment.objects.select_related("user__profile").order_by("created_at"),
                )
            )
        )
        if episode and episode.isdigit():
            qs = qs.filter(episode=int(episode))
        else:
            qs = qs.filter(episode__isnull=True)
        return qs.order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CommentDelete(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Comment.objects.all() if user.is_staff else Comment.objects.filter(user=user)