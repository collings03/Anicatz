from django.conf import settings
from django.db import models


class WatchlistEntry(models.Model):
    class Status(models.TextChoices):
        WATCHING = "watching", "Watching"
        PLANNED = "planned", "Plan to watch"
        COMPLETED = "completed", "Completed"
        DROPPED = "dropped", "Dropped"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watchlist")
    anilist_id = models.PositiveIntegerField()
    title = models.CharField(max_length=300)
    cover_image = models.URLField(blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PLANNED)
    progress = models.PositiveIntegerField(default=0)  # last episode watched
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "anilist_id")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.user} - {self.title}"
