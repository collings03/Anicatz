# Save as: backend/accounts/models.py
from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    # Uploaded photo (cannot persist on Vercel; kept for local use or when cloud storage is added)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    # Id of a built-in avatar picked in the app, e.g. "lime". Empty = none chosen.
    avatar_preset = models.CharField(max_length=40, blank=True, default="")