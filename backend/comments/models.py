from django.db import models

# Create your models here.
from django.conf import settings
from django.db import models


class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="comments")
    anime_id = models.PositiveIntegerField(db_index=True)          # AniList id
    episode = models.PositiveIntegerField(null=True, blank=True)   # null = comment on the anime itself
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    body = models.TextField(max_length=1000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["anime_id", "episode", "-created_at"])]