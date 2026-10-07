# Save as: backend/accounts/models.py
import random

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .names import generate_username

# Must match the ids in frontend/lib/avatar.ts (AVATARS), e.g. "lime".
# Fill this list with your real ids.
AVATAR_IDS = ["lime"]


class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    # Uploaded photo (cannot persist on Vercel; kept for local use or when cloud storage is added)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    # Id of a built-in avatar picked in the app, e.g. "lime". Empty = none chosen.
    avatar_preset = models.CharField(max_length=40, blank=True, default="")


@receiver(pre_save, sender=get_user_model())
def give_random_username(sender, instance, **kwargs):
    """New user without a username gets one like LuffySenpai482."""
    if not instance.username:
        instance.username = generate_username()


@receiver(post_save, sender=get_user_model())
def give_random_avatar(sender, instance, created, **kwargs):
    """New user gets a Profile with a random built-in avatar."""
    if created:
        Profile.objects.get_or_create(
            user=instance,
            defaults={"avatar_preset": random.choice(AVATAR_IDS)},
        )